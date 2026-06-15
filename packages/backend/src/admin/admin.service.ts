import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { UserProfile, GuideVerificationStatus } from '../database/entities/user-profile.entity';
import { Experience, ExperienceStatus } from '../database/entities/experience.entity';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { Payment, PaymentStatus } from '../database/entities/payment.entity';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import {
  VerificationRequest,
  VerificationStatus,
} from '../database/entities/verification-request.entity';
import { VerificationDocument } from '../database/entities/verification-document.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import {
  IAdminService,
  VerificationRequestDto,
  DocumentDto,
  PlatformMetrics,
  AuditLogDto,
} from './interfaces/admin.interfaces';

/** Minimum bookings for "Top Guide" badge */
const TOP_GUIDE_MIN_BOOKINGS = 10;
/** Minimum average rating for "Top Guide" badge */
const TOP_GUIDE_MIN_RATING = 4.5;
/** Average rating threshold below which a guide is flagged */
const LOW_RATING_THRESHOLD = 3.0;
/** Cache TTL in milliseconds (5 minutes) */
const METRICS_CACHE_TTL_MS = 5 * 60 * 1000;

export const CACHE_MANAGER = 'CACHE_MANAGER';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class AdminService implements IAdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly metricsCache = new Map<string, CacheEntry<PlatformMetrics>>();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(Experience) private readonly experienceRepo: Repository<Experience>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(VerificationRequest)
    private readonly verificationRepo: Repository<VerificationRequest>,
    @InjectRepository(VerificationDocument)
    private readonly documentRepo: Repository<VerificationDocument>,
    @InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource
  ) {}

  // ─── Verification Management ─────────────────────────────────────────────

  async getVerificationRequests(status?: string): Promise<VerificationRequestDto[]> {
    const where = status ? { status: status as VerificationStatus } : {};
    const requests = await this.verificationRepo.find({
      where,
      relations: ['documents'],
      order: { submittedAt: 'DESC' },
    });
    return requests.map((r: VerificationRequest) => this.mapVerificationRequest(r));
  }

  async approveVerification(requestId: string, adminId: string): Promise<void> {
    const request = await this.verificationRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException(`Verification request ${requestId} not found`);
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(`Verification request is already ${request.status}`);
    }

    await this.dataSource.transaction(async (manager: EntityManager) => {
      // Update verification request
      await manager.update(VerificationRequest, requestId, {
        status: VerificationStatus.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      // Update guide's profile verification status
      await manager.update(
        UserProfile,
        { userId: request.guideId },
        {
          guideVerificationStatus: GuideVerificationStatus.APPROVED,
        }
      );

      // Mark user as verified
      await manager.update(User, request.guideId, { verified: true });
    });

    await this.logAction(adminId, 'approve_verification', 'verification_request', requestId, {
      guideId: request.guideId,
    });

    this.logger.log(`Verification request ${requestId} approved by admin ${adminId}`);
  }

  async rejectVerification(requestId: string, adminId: string, reason: string): Promise<void> {
    const request = await this.verificationRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Verification request ${requestId} not found`);
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(`Verification request is already ${request.status}`);
    }

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.update(VerificationRequest, requestId, {
        status: VerificationStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      });

      await manager.update(
        UserProfile,
        { userId: request.guideId },
        {
          guideVerificationStatus: GuideVerificationStatus.REJECTED,
        }
      );
    });

    await this.logAction(adminId, 'reject_verification', 'verification_request', requestId, {
      guideId: request.guideId,
      reason,
    });

    this.logger.log(`Verification request ${requestId} rejected by admin ${adminId}`);
  }

  // ─── Experience Approval ──────────────────────────────────────────────────

  async approveExperience(experienceId: string, adminId: string): Promise<void> {
    const experience = await this.experienceRepo.findOne({ where: { id: experienceId } });
    if (!experience) throw new NotFoundException(`Experience ${experienceId} not found`);
    if (experience.status !== ExperienceStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Experience is not pending approval (current: ${experience.status})`
      );
    }

    await this.experienceRepo.update(experienceId, { status: ExperienceStatus.ACTIVE });

    await this.logAction(adminId, 'approve_experience', 'experience', experienceId, {
      previousStatus: experience.status,
      newStatus: ExperienceStatus.ACTIVE,
    });

    this.logger.log(`Experience ${experienceId} approved by admin ${adminId}`);
  }

  async rejectExperience(experienceId: string, adminId: string, reason: string): Promise<void> {
    const experience = await this.experienceRepo.findOne({ where: { id: experienceId } });
    if (!experience) throw new NotFoundException(`Experience ${experienceId} not found`);
    if (experience.status !== ExperienceStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Experience is not pending approval (current: ${experience.status})`
      );
    }

    await this.experienceRepo.update(experienceId, { status: ExperienceStatus.INACTIVE });

    await this.logAction(adminId, 'reject_experience', 'experience', experienceId, {
      previousStatus: experience.status,
      newStatus: ExperienceStatus.INACTIVE,
      reason,
    });

    this.logger.log(`Experience ${experienceId} rejected by admin ${adminId}`);
  }

  // ─── User Account Management ──────────────────────────────────────────────

  async suspendUser(userId: string, adminId: string, reason: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.locked) throw new BadRequestException('User is already suspended');

    await this.userRepo.update(userId, { locked: true });

    await this.logAction(adminId, 'suspend_user', 'user', userId, { reason });

    this.logger.log(`User ${userId} suspended by admin ${adminId}: ${reason}`);
  }

  async unsuspendUser(userId: string, adminId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.locked) throw new BadRequestException('User is not suspended');

    await this.userRepo.update(userId, { locked: false, lockoutUntil: null });

    await this.logAction(adminId, 'unsuspend_user', 'user', userId, {});

    this.logger.log(`User ${userId} unsuspended by admin ${adminId}`);
  }

  // ─── Review Moderation ────────────────────────────────────────────────────

  async getFlaggedReviews(): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { status: ReviewStatus.FLAGGED },
      order: { updatedAt: 'DESC' },
    });
  }

  // ─── Refund Management ────────────────────────────────────────────────────

  async issueRefund(paymentId: string, adminId: string, reason: string): Promise<void> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    const refundableStatuses: PaymentStatus[] = [
      PaymentStatus.ESCROWED,
      PaymentStatus.CAPTURED,
      PaymentStatus.RELEASED,
    ];
    if (!refundableStatuses.includes(payment.status)) {
      throw new BadRequestException(`Cannot refund payment in status '${payment.status}'`);
    }

    await this.paymentRepo.update(paymentId, {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
    });

    await this.logAction(adminId, 'issue_refund', 'payment', paymentId, {
      reason,
      amount: payment.amount,
      currency: payment.currency,
    });

    this.logger.log(`Refund issued for payment ${paymentId} by admin ${adminId}`);
  }

  // ─── Platform Metrics ─────────────────────────────────────────────────────

  async getMetrics(startDate: Date, endDate: Date): Promise<PlatformMetrics> {
    const cacheKey = `metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.metricsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug('Returning cached metrics');
      return cached.data;
    }

    const [totalUsers, totalGuides, totalTravelers, totalExperiences, bookingStats] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo.count({ where: { role: UserRole.GUIDE } }),
        this.userRepo.count({ where: { role: UserRole.TRAVELER } }),
        this.experienceRepo.count(),
        this.bookingRepo
          .createQueryBuilder('b')
          .select('COUNT(b.id)', 'totalBookings')
          .addSelect('COALESCE(SUM(b.totalAmount), 0)', 'totalRevenue')
          .addSelect('COALESCE(AVG(b.totalAmount), 0)', 'avgBookingValue')
          .where('b.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
          .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
          .getRawOne<{ totalBookings: string; totalRevenue: string; avgBookingValue: string }>(),
      ]);

    const metrics: PlatformMetrics = {
      totalUsers,
      totalGuides,
      totalTravelers,
      totalExperiences,
      totalBookings: parseInt(bookingStats?.totalBookings ?? '0', 10),
      totalRevenue: {
        amount: parseFloat(bookingStats?.totalRevenue ?? '0'),
        currency: 'USD',
      },
      averageBookingValue: {
        amount: parseFloat(bookingStats?.avgBookingValue ?? '0'),
        currency: 'USD',
      },
      period: { start: startDate, end: endDate },
    };

    this.metricsCache.set(cacheKey, {
      data: metrics,
      expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
    });

    return metrics;
  }

  // ─── Audit Logging ────────────────────────────────────────────────────────

  async getAuditLogs(filters?: {
    adminId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogDto[]> {
    const qb = this.auditLogRepo.createQueryBuilder('al').orderBy('al.timestamp', 'DESC');

    if (filters?.adminId) {
      qb.andWhere('al.adminId = :adminId', { adminId: filters.adminId });
    }
    if (filters?.startDate) {
      qb.andWhere('al.timestamp >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('al.timestamp <= :endDate', { endDate: filters.endDate });
    }

    const logs = await qb.getMany();
    return logs.map((l: AuditLog) => this.mapAuditLog(l));
  }

  // ─── Trust Badge System ───────────────────────────────────────────────────

  async updateTrustBadges(): Promise<void> {
    // Find all guides
    const guides = await this.userRepo.find({ where: { role: UserRole.GUIDE } });

    for (const guide of guides) {
      const completedBookings = await this.bookingRepo.count({
        where: { guideId: guide.id, status: BookingStatus.COMPLETED },
      });

      const ratingResult = await this.reviewRepo
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .where('r.guideId = :guideId', { guideId: guide.id })
        .andWhere('r.status = :status', { status: ReviewStatus.PUBLISHED })
        .getRawOne<{ avg: string }>();

      const avgRating = parseFloat(ratingResult?.avg ?? '0');

      // Flag guides with low ratings for review
      if (avgRating > 0 && avgRating < LOW_RATING_THRESHOLD) {
        if (!guide.locked) {
          this.logger.warn(
            `Guide ${guide.id} has average rating ${avgRating} below threshold ${LOW_RATING_THRESHOLD} — flagging for review`
          );
          // We log this as an audit action (system-initiated)
          await this.logAction('system', 'flag_low_rating_guide', 'user', guide.id, {
            averageRating: avgRating,
            threshold: LOW_RATING_THRESHOLD,
          });
        }
      }

      // Assign "Top Guide" badge if criteria met
      if (completedBookings >= TOP_GUIDE_MIN_BOOKINGS && avgRating >= TOP_GUIDE_MIN_RATING) {
        this.logger.log(
          `Guide ${guide.id} qualifies for Top Guide badge (bookings: ${completedBookings}, rating: ${avgRating})`
        );
        // Badge assignment is tracked via audit log; actual badge display is handled by profile queries
        await this.logAction('system', 'assign_top_guide_badge', 'user', guide.id, {
          completedBookings,
          averageRating: avgRating,
        });
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async logAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes: Record<string, any>
  ): Promise<void> {
    const log = this.auditLogRepo.create({
      adminId,
      action,
      resourceType,
      resourceId,
      changes,
      timestamp: new Date(),
    });
    await this.auditLogRepo.save(log);
  }

  private mapVerificationRequest(r: VerificationRequest): VerificationRequestDto {
    return {
      id: r.id,
      guideId: r.guideId,
      documents: (r.documents ?? []).map((d) => this.mapDocument(d)),
      status: r.status as VerificationRequestDto['status'],
      reviewedBy: r.reviewedBy ?? undefined,
      reviewedAt: r.reviewedAt ?? undefined,
      rejectionReason: r.rejectionReason ?? undefined,
      submittedAt: r.submittedAt,
    };
  }

  private mapDocument(d: VerificationDocument): DocumentDto {
    return {
      id: d.id,
      type: d.type,
      url: d.url,
      uploadedAt: d.uploadedAt,
    };
  }

  private mapAuditLog(l: AuditLog): AuditLogDto {
    return {
      id: l.id,
      adminId: l.adminId,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      changes: l.changes ?? {},
      timestamp: l.timestamp,
    };
  }
}
