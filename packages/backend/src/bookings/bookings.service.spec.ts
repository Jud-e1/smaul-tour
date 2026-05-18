import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { BookingsService, REDIS_CLIENT } from './bookings.service';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { AvailabilitySlot, SlotStatus } from '../database/entities/availability-slot.entity';
import { Experience, CancellationPolicy } from '../database/entities/experience.entity';
import { Payment, PaymentStatus } from '../database/entities/payment.entity';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 'exp-1',
    guideId: 'guide-1',
    title: 'City Tour',
    description: 'A great tour',
    locationAddress: '123 Main St',
    locationLat: 40.7128,
    locationLng: -74.006,
    durationHours: 2,
    priceAmount: 50,
    priceCurrency: 'USD',
    category: ['culture'],
    primaryImageId: null,
    status: 'active' as any,
    averageRating: 4.5,
    reviewCount: 10,
    cancellationPolicy: CancellationPolicy.MODERATE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    images: [],
    availabilitySlots: [],
    bookings: [],
    reviews: [],
    guide: null,
    ...overrides,
  } as Experience;
}

function makeSlot(overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    id: 'slot-1',
    experienceId: 'exp-1',
    date: new Date('2026-06-01'),
    startTime: '09:00',
    endTime: '11:00',
    capacity: 10,
    booked: 0,
    status: SlotStatus.AVAILABLE,
    createdAt: new Date('2026-01-01'),
    experience: null,
    ...overrides,
  } as AvailabilitySlot;
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    referenceNumber: 'AB12CD34',
    travelerId: 'traveler-1',
    experienceId: 'exp-1',
    guideId: 'guide-1',
    date: new Date('2026-06-01'),
    startTime: '09:00',
    endTime: '11:00',
    participants: 2,
    totalAmount: 100,
    totalCurrency: 'USD',
    status: BookingStatus.CONFIRMED,
    cancellationPolicy: CancellationPolicy.MODERATE,
    paymentId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    traveler: null,
    guide: null,
    experience: null,
    payments: [],
    reviews: [],
    ...overrides,
  } as Booking;
}

// ─── Mock QueryBuilder ───────────────────────────────────────────────────────

function makeMockQb(results: any[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(results[0] ?? null),
    getMany: jest.fn().mockResolvedValue(results),
  };
  return qb;
}

// ─── Mock DataSource ─────────────────────────────────────────────────────────

function makeMockDataSource(transactionFn?: (manager: any) => Promise<any>) {
  const manager = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  return {
    transaction: jest.fn().mockImplementation((cb: (m: any) => Promise<any>) =>
      transactionFn ? transactionFn(manager) : cb(manager),
    ),
    _manager: manager,
  };
}

// ─── Mock Redis ──────────────────────────────────────────────────────────────

function makeMockRedis() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: any;
  let slotRepo: any;
  let experienceRepo: any;
  let paymentRepo: any;
  let dataSource: any;
  let redis: any;

  beforeEach(async () => {
    bookingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    slotRepo = { findOne: jest.fn() };
    experienceRepo = { findOne: jest.fn() };
    paymentRepo = { findOne: jest.fn(), save: jest.fn() };
    dataSource = makeMockDataSource();
    redis = makeMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(AvailabilitySlot), useValue: slotRepo },
        { provide: getRepositoryToken(Experience), useValue: experienceRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: 'DataSource', useValue: dataSource },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    // Inject DataSource manually since NestJS uses the class token
    (service as any).dataSource = dataSource;
  });

  // ─── createBooking ─────────────────────────────────────────────────────────

  describe('createBooking', () => {
    it('should create a booking when slot is available', async () => {
      const experience = makeExperience();
      const slot = makeSlot();
      const savedBooking = makeBooking();

      const manager = {
        createQueryBuilder: jest.fn()
          .mockReturnValueOnce({ ...makeMockQb([experience]), setLock: jest.fn().mockReturnThis() })
          .mockReturnValueOnce({ ...makeMockQb([slot]), setLock: jest.fn().mockReturnThis() }),
        findOne: jest.fn().mockResolvedValue(null), // no duplicate reference
        create: jest.fn().mockReturnValue(savedBooking),
        save: jest.fn().mockResolvedValue(savedBooking),
      };

      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const result = await service.createBooking({
        travelerId: 'traveler-1',
        experienceId: 'exp-1',
        date: '2026-06-01',
        startTime: '09:00',
        participants: 2,
      });

      expect(result.referenceNumber).toBe('AB12CD34');
      expect(result.status).toBe('confirmed');
      expect(manager.save).toHaveBeenCalledTimes(2); // slot + booking
    });

    it('should throw NotFoundException when experience does not exist', async () => {
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.createBooking({
          travelerId: 'traveler-1',
          experienceId: 'nonexistent',
          date: '2026-06-01',
          startTime: '09:00',
          participants: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when slot does not exist', async () => {
      const experience = makeExperience();
      let callCount = 0;
      const manager = {
        createQueryBuilder: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              where: jest.fn().mockReturnThis(),
              setLock: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(experience),
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          };
        }),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.createBooking({
          travelerId: 'traveler-1',
          experienceId: 'exp-1',
          date: '2026-06-01',
          startTime: '09:00',
          participants: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when slot is fully booked', async () => {
      const experience = makeExperience();
      const fullSlot = makeSlot({ capacity: 2, booked: 2, status: SlotStatus.BOOKED });
      let callCount = 0;
      const manager = {
        createQueryBuilder: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              where: jest.fn().mockReturnThis(),
              setLock: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(experience),
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(fullSlot),
          };
        }),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.createBooking({
          travelerId: 'traveler-1',
          experienceId: 'exp-1',
          date: '2026-06-01',
          startTime: '09:00',
          participants: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return cached result for duplicate idempotency key', async () => {
      const cachedBooking = makeBooking();
      redis.get.mockResolvedValue(JSON.stringify(service.mapToDto(cachedBooking)));

      const result = await service.createBooking({
        travelerId: 'traveler-1',
        experienceId: 'exp-1',
        date: '2026-06-01',
        startTime: '09:00',
        participants: 1,
        idempotencyKey: 'idem-key-123',
      });

      expect(result.id).toBe('booking-1');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when Redis lock is already held', async () => {
      redis.get.mockResolvedValue(null); // no idempotency cache
      redis.set.mockResolvedValue(null); // lock not acquired

      await expect(
        service.createBooking({
          travelerId: 'traveler-1',
          experienceId: 'exp-1',
          date: '2026-06-01',
          startTime: '09:00',
          participants: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── cancelBooking ─────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('should apply full refund for flexible policy within 24h cutoff', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days from now
      const booking = makeBooking({
        cancellationPolicy: CancellationPolicy.FLEXIBLE,
        date: futureDate,
        totalAmount: 100,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const manager = {
        save: jest.fn().mockResolvedValue(booking),
        findOne: jest.fn().mockResolvedValue(makeSlot()),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const result = await service.cancelBooking({
        bookingId: 'booking-1',
        userId: 'traveler-1',
        userRole: 'traveler',
        reason: 'Change of plans',
      });

      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(100);
    });

    it('should apply 50% refund for flexible policy past 24h cutoff', async () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12); // 12 hours from now (past 24h cutoff)
      const booking = makeBooking({
        cancellationPolicy: CancellationPolicy.FLEXIBLE,
        date: soonDate,
        totalAmount: 100,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const manager = {
        save: jest.fn().mockResolvedValue(booking),
        findOne: jest.fn().mockResolvedValue(makeSlot()),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const result = await service.cancelBooking({
        bookingId: 'booking-1',
        userId: 'traveler-1',
        userRole: 'traveler',
        reason: 'Emergency',
      });

      expect(result.refundPercentage).toBe(50);
      expect(result.refundAmount).toBe(50);
    });

    it('should apply full refund for moderate policy with 8+ days notice', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10); // 10 days from now
      const booking = makeBooking({
        cancellationPolicy: CancellationPolicy.MODERATE,
        date: futureDate,
        totalAmount: 200,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const manager = {
        save: jest.fn().mockResolvedValue(booking),
        findOne: jest.fn().mockResolvedValue(makeSlot()),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const result = await service.cancelBooking({
        bookingId: 'booking-1',
        userId: 'traveler-1',
        userRole: 'traveler',
        reason: 'Plans changed',
      });

      expect(result.refundPercentage).toBe(100);
    });

    it('should apply full refund when guide cancels regardless of policy', async () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 2); // 2 hours from now
      const booking = makeBooking({
        cancellationPolicy: CancellationPolicy.STRICT,
        date: soonDate,
        totalAmount: 300,
        guideId: 'guide-1',
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const manager = {
        save: jest.fn().mockResolvedValue(booking),
        findOne: jest.fn().mockResolvedValue(makeSlot()),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const result = await service.cancelBooking({
        bookingId: 'booking-1',
        userId: 'guide-1',
        userRole: 'guide',
        reason: 'Guide emergency',
      });

      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(300);
    });

    it('should throw ConflictException when booking is already cancelled', async () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancelBooking({
          bookingId: 'booking-1',
          userId: 'traveler-1',
          userRole: 'traveler',
          reason: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelBooking({
          bookingId: 'nonexistent',
          userId: 'traveler-1',
          userRole: 'traveler',
          reason: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should restore availability slot on cancellation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const booking = makeBooking({
        cancellationPolicy: CancellationPolicy.FLEXIBLE,
        date: futureDate,
        participants: 2,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const slot = makeSlot({ booked: 2, capacity: 5, status: SlotStatus.AVAILABLE });
      const manager = {
        save: jest.fn().mockResolvedValue(booking),
        findOne: jest.fn().mockResolvedValue(slot),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.cancelBooking({
        bookingId: 'booking-1',
        userId: 'traveler-1',
        userRole: 'traveler',
        reason: 'Test',
      });

      // slot.booked should be decremented
      expect(slot.booked).toBe(0);
      expect(manager.save).toHaveBeenCalledWith(AvailabilitySlot, slot);
    });
  });

  // ─── completeBooking ───────────────────────────────────────────────────────

  describe('completeBooking', () => {
    it('should mark booking as completed', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.COMPLETED, completedAt: new Date() });

      const result = await service.completeBooking('booking-1');

      expect(result.status).toBe('completed');
    });

    it('should throw ConflictException when booking is not confirmed', async () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.completeBooking('booking-1')).rejects.toThrow(ConflictException);
    });

    it('should trigger payment release when paymentId is set', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED, paymentId: 'pay-1' });
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.COMPLETED });

      const payment = { id: 'pay-1', status: PaymentStatus.ESCROWED } as Payment;
      paymentRepo.findOne.mockResolvedValue(payment);
      paymentRepo.save.mockResolvedValue({ ...payment, status: PaymentStatus.RELEASED });

      await service.completeBooking('booking-1');

      // Give the fire-and-forget a tick to run
      await new Promise(r => setTimeout(r, 10));
      expect(paymentRepo.save).toHaveBeenCalled();
    });
  });

  // ─── checkAvailability ─────────────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('should return true when slot is available with capacity', async () => {
      slotRepo.findOne.mockResolvedValue(makeSlot({ booked: 3, capacity: 10, status: SlotStatus.AVAILABLE }));
      const result = await service.checkAvailability('exp-1', '2026-06-01', '09:00');
      expect(result).toBe(true);
    });

    it('should return false when slot is fully booked', async () => {
      slotRepo.findOne.mockResolvedValue(makeSlot({ booked: 10, capacity: 10, status: SlotStatus.BOOKED }));
      const result = await service.checkAvailability('exp-1', '2026-06-01', '09:00');
      expect(result).toBe(false);
    });

    it('should return false when slot does not exist', async () => {
      slotRepo.findOne.mockResolvedValue(null);
      const result = await service.checkAvailability('exp-1', '2026-06-01', '09:00');
      expect(result).toBe(false);
    });
  });

  // ─── getUserBookings / getGuideBookings ────────────────────────────────────

  describe('getUserBookings', () => {
    it('should return bookings for a user', async () => {
      const bookings = [makeBooking(), makeBooking({ id: 'booking-2', referenceNumber: 'XY98ZW76' })];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(bookings),
      };
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUserBookings('traveler-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by groupBy=upcoming', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getUserBookings('traveler-1', { groupBy: 'upcoming' });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('b.date'), expect.any(Object));
    });
  });

  // ─── idempotency ──────────────────────────────────────────────────────────

  describe('idempotency', () => {
    it('should store result in Redis after successful booking', async () => {
      const experience = makeExperience();
      const slot = makeSlot();
      const savedBooking = makeBooking();

      let callCount = 0;
      const manager = {
        createQueryBuilder: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              where: jest.fn().mockReturnThis(),
              setLock: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(experience),
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(slot),
          };
        }),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(savedBooking),
        save: jest.fn().mockResolvedValue(savedBooking),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.createBooking({
        travelerId: 'traveler-1',
        experienceId: 'exp-1',
        date: '2026-06-01',
        startTime: '09:00',
        participants: 1,
        idempotencyKey: 'unique-key-abc',
      });

      expect(redis.setex).toHaveBeenCalledWith(
        'idempotency:booking:unique-key-abc',
        expect.any(Number),
        expect.any(String),
      );
    });
  });
});
