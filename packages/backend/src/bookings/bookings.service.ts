import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { AvailabilitySlot, SlotStatus } from '../database/entities/availability-slot.entity';
import { Experience, CancellationPolicy } from '../database/entities/experience.entity';
import { Payment, PaymentStatus } from '../database/entities/payment.entity';
import {
  BookingDto,
  BookingRequest,
  CancellationRequest,
  CancellationResult,
  BookingListFilters,
} from './interfaces/booking.interfaces';
import { BookingNotificationsService } from '../notifications/booking-notifications.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Minimal Redis interface so we can mock in tests without the full ioredis type */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: string,
    duration: number,
    flag: string
  ): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly IDEMPOTENCY_TTL = 86400; // 24 hours in seconds
  private readonly LOCK_TTL = 10000; // 10 seconds in ms

  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(AvailabilitySlot) private slotRepo: Repository<AvailabilitySlot>,
    @InjectRepository(Experience) private experienceRepo: Repository<Experience>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private dataSource: DataSource,
    @Optional() @Inject(REDIS_CLIENT) private redis: RedisClient | null,
    @Optional() private readonly bookingNotificationsService: BookingNotificationsService | null
  ) {}

  async createBooking(request: BookingRequest): Promise<BookingDto> {
    // Check idempotency key first
    if (request.idempotencyKey && this.redis) {
      const cached = await this.redis.get(`idempotency:booking:${request.idempotencyKey}`);
      if (cached) {
        this.logger.log(`Returning cached booking for idempotency key: ${request.idempotencyKey}`);
        return JSON.parse(cached) as BookingDto;
      }
    }

    const lockKey = `lock:booking:${request.experienceId}:${request.date}:${request.startTime}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    let lockAcquired = false;

    if (this.redis) {
      const acquired = await this.redis.set(lockKey, lockValue, 'PX', this.LOCK_TTL, 'NX');
      if (!acquired) {
        throw new ConflictException(
          'Another booking is being processed for this slot. Please try again.'
        );
      }
      lockAcquired = true;
    }

    try {
      const booking = await this.dataSource.transaction(async (manager) => {
        // Load experience with row-level lock
        const experience = await manager
          .createQueryBuilder(Experience, 'exp')
          .where('exp.id = :id', { id: request.experienceId })
          .setLock('pessimistic_read')
          .getOne();

        if (!experience) {
          throw new NotFoundException('Experience not found');
        }

        // Find and lock the availability slot
        const slot = await manager
          .createQueryBuilder(AvailabilitySlot, 'slot')
          .where('slot.experienceId = :expId', { expId: request.experienceId })
          .andWhere('slot.date = :date', { date: request.date })
          .andWhere('slot.startTime = :startTime', { startTime: request.startTime })
          .setLock('pessimistic_write')
          .getOne();

        if (!slot) {
          throw new BadRequestException('The selected date and time slot is not available');
        }

        if (slot.status !== SlotStatus.AVAILABLE) {
          throw new ConflictException('The selected date and time slot is no longer available');
        }

        const remaining = slot.capacity - slot.booked;
        if (remaining < request.participants) {
          throw new ConflictException(
            `Not enough capacity. Only ${remaining} spot(s) remaining for this slot.`
          );
        }

        // Update slot booking count
        slot.booked += request.participants;
        if (slot.booked >= slot.capacity) {
          slot.status = SlotStatus.BOOKED;
        }
        await manager.save(AvailabilitySlot, slot);

        // Generate unique reference number
        const referenceNumber = await this.generateUniqueReferenceNumber(manager);

        // Calculate total amount
        const totalAmount = Number(experience.priceAmount) * request.participants;

        const booking = manager.create(Booking, {
          referenceNumber,
          travelerId: request.travelerId,
          experienceId: request.experienceId,
          guideId: experience.guideId,
          date: new Date(request.date),
          startTime: request.startTime,
          endTime: slot.endTime,
          participants: request.participants,
          totalAmount,
          totalCurrency: experience.priceCurrency,
          status: BookingStatus.CONFIRMED,
          cancellationPolicy: experience.cancellationPolicy,
        });

        return manager.save(Booking, booking);
      });

      const dto = this.mapToDto(booking);

      // Store idempotency result
      if (request.idempotencyKey && this.redis) {
        await this.redis.setex(
          `idempotency:booking:${request.idempotencyKey}`,
          this.IDEMPOTENCY_TTL,
          JSON.stringify(dto)
        );
      }

      // Send booking confirmation notifications (fire-and-forget)
      if (this.bookingNotificationsService) {
        const experience = await this.experienceRepo.findOne({
          where: { id: booking.experienceId },
        });
        this.bookingNotificationsService
          .sendBookingConfirmation({
            bookingId: booking.id,
            referenceNumber: booking.referenceNumber,
            experienceName: experience?.title ?? 'Experience',
            date: dto.date,
            travelerId: booking.travelerId,
            guideId: booking.guideId,
          })
          .catch((err) =>
            this.logger.warn(`Booking confirmation notification failed: ${(err as Error).message}`)
          );
      }

      return dto;
    } finally {
      // Release lock only if we still own it
      if (lockAcquired && this.redis) {
        const currentValue = await this.redis.get(lockKey);
        if (currentValue === lockValue) {
          await this.redis.del(lockKey);
        }
      }
    }
  }

  async getBooking(id: string): Promise<BookingDto> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.mapToDto(booking);
  }

  async getUserBookings(userId: string, filters?: BookingListFilters): Promise<BookingDto[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.travelerId = :userId', { userId })
      .orderBy('b.date', 'ASC')
      .addOrderBy('b.startTime', 'ASC');

    this.applyBookingFilters(qb, filters);

    const bookings = await qb.getMany();
    return bookings.map((b) => this.mapToDto(b));
  }

  async getGuideBookings(guideId: string, filters?: BookingListFilters): Promise<BookingDto[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.guideId = :guideId', { guideId })
      .orderBy('b.date', 'ASC')
      .addOrderBy('b.startTime', 'ASC');

    this.applyBookingFilters(qb, filters);

    const bookings = await qb.getMany();
    return bookings.map((b) => this.mapToDto(b));
  }

  async cancelBooking(request: CancellationRequest): Promise<CancellationResult> {
    const booking = await this.bookingRepo.findOne({ where: { id: request.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      throw new ConflictException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel a completed booking');
    }

    // Verify the requester owns this booking (unless admin)
    if (request.userRole !== 'admin') {
      const isOwner =
        (request.userRole === 'traveler' && booking.travelerId === request.userId) ||
        (request.userRole === 'guide' && booking.guideId === request.userId);
      if (!isOwner) {
        throw new BadRequestException('You are not authorized to cancel this booking');
      }
    }

    const { refundPercentage, message } = this.calculateRefund(
      booking,
      request.userRole === 'guide'
    );

    const refundAmount = Number(booking.totalAmount) * (refundPercentage / 100);

    await this.dataSource.transaction(async (manager) => {
      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancellationReason = request.reason;
      await manager.save(Booking, booking);

      // Restore availability slot
      const slot = await manager.findOne(AvailabilitySlot, {
        where: {
          experienceId: booking.experienceId,
          date: booking.date,
          startTime: booking.startTime,
        },
      });

      if (slot) {
        slot.booked = Math.max(0, slot.booked - booking.participants);
        if (slot.status === SlotStatus.BOOKED && slot.booked < slot.capacity) {
          slot.status = SlotStatus.AVAILABLE;
        }
        await manager.save(AvailabilitySlot, slot);
      }
    });

    // Send cancellation notifications (fire-and-forget)
    if (this.bookingNotificationsService) {
      const experience = await this.experienceRepo.findOne({ where: { id: booking.experienceId } });
      this.bookingNotificationsService
        .sendBookingCancellation({
          bookingId: booking.id,
          referenceNumber: booking.referenceNumber,
          experienceName: experience?.title ?? 'Experience',
          date:
            booking.date instanceof Date
              ? booking.date.toISOString().split('T')[0]
              : String(booking.date),
          travelerId: booking.travelerId,
          guideId: booking.guideId,
          refundAmount,
          refundCurrency: booking.totalCurrency,
          cancellationReason: request.reason,
        })
        .catch((err) =>
          this.logger.warn(`Booking cancellation notification failed: ${(err as Error).message}`)
        );
    }

    return {
      success: true,
      refundAmount,
      refundCurrency: booking.totalCurrency,
      refundPercentage,
      message,
    };
  }

  async completeBooking(bookingId: string): Promise<BookingDto> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException(`Cannot complete a booking with status: ${booking.status}`);
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    const saved = await this.bookingRepo.save(booking);

    // Trigger payment release (fire-and-forget; payment service handles this)
    if (booking.paymentId) {
      this.triggerPaymentRelease(booking.paymentId).catch((err) =>
        this.logger.warn(
          `Failed to trigger payment release for booking ${bookingId}: ${(err as Error).message}`
        )
      );
    }

    return this.mapToDto(saved);
  }

  async checkAvailability(experienceId: string, date: string, startTime: string): Promise<boolean> {
    const slot = await this.slotRepo.findOne({
      where: { experienceId, date: new Date(date) as any, startTime },
    });

    if (!slot) return false;
    return slot.status === SlotStatus.AVAILABLE && slot.booked < slot.capacity;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private applyBookingFilters(qb: any, filters?: BookingListFilters): void {
    if (!filters) return;

    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    } else if (filters.groupBy) {
      const now = new Date();
      if (filters.groupBy === 'upcoming') {
        qb.andWhere('b.date >= :now', { now }).andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
        });
      } else if (filters.groupBy === 'past') {
        qb.andWhere('b.status = :status', { status: BookingStatus.COMPLETED });
      } else if (filters.groupBy === 'cancelled') {
        qb.andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
        });
      }
    }
  }

  private calculateRefund(
    booking: Booking,
    isCancelledByGuide: boolean
  ): { refundPercentage: number; message: string } {
    // Guide cancellation always results in full refund
    if (isCancelledByGuide) {
      return {
        refundPercentage: 100,
        message: 'Full refund issued as guide cancelled the booking.',
      };
    }

    const now = new Date();
    const bookingDate = new Date(booking.date);
    const hoursUntilExperience = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const policy = booking.cancellationPolicy as CancellationPolicy;

    let cutoffHours: number;
    switch (policy) {
      case CancellationPolicy.FLEXIBLE:
        cutoffHours = 24;
        break;
      case CancellationPolicy.MODERATE:
        cutoffHours = 7 * 24; // 7 days
        break;
      case CancellationPolicy.STRICT:
        cutoffHours = 14 * 24; // 14 days
        break;
      default:
        cutoffHours = 24;
    }

    if (hoursUntilExperience >= cutoffHours) {
      return {
        refundPercentage: 100,
        message: `Full refund issued per ${policy} cancellation policy.`,
      };
    }

    return {
      refundPercentage: 50,
      message: `Partial refund (50%) issued. Cancellation was made after the ${policy} policy deadline.`,
    };
  }

  private async generateUniqueReferenceNumber(manager: any): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      let ref = '';
      for (let i = 0; i < 8; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await manager.findOne(Booking, { where: { referenceNumber: ref } });
      if (!existing) return ref;
    }
    throw new Error('Failed to generate unique booking reference number');
  }

  private async triggerPaymentRelease(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (payment && payment.status === PaymentStatus.ESCROWED) {
      payment.status = PaymentStatus.RELEASED;
      payment.releasedAt = new Date();
      await this.paymentRepo.save(payment);
      this.logger.log(`Payment ${paymentId} released to guide`);
    }
  }

  mapToDto(booking: Booking): BookingDto {
    return {
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      travelerId: booking.travelerId,
      experienceId: booking.experienceId,
      guideId: booking.guideId,
      date:
        booking.date instanceof Date
          ? booking.date.toISOString().split('T')[0]
          : String(booking.date),
      startTime: booking.startTime,
      endTime: booking.endTime,
      participants: booking.participants,
      totalAmount: Number(booking.totalAmount),
      totalCurrency: booking.totalCurrency,
      status: booking.status as BookingDto['status'],
      cancellationPolicy: booking.cancellationPolicy as BookingDto['cancellationPolicy'],
      paymentId: booking.paymentId ?? undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      completedAt: booking.completedAt ?? undefined,
      cancelledAt: booking.cancelledAt ?? undefined,
      cancellationReason: booking.cancellationReason ?? undefined,
    };
  }
}
