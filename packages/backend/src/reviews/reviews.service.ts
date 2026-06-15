import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { Experience } from '../database/entities/experience.entity';
import {
  ReviewDto,
  CreateReviewDto,
  ReviewListResult,
  IReviewService,
} from './interfaces/review.interfaces';

/** Number of days after experience completion within which a review can be submitted */
const REVIEW_WINDOW_DAYS = 30;

@Injectable()
export class ReviewsService implements IReviewService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Experience) private experienceRepo: Repository<Experience>,
    private dataSource: DataSource
  ) {}

  async createReview(travelerId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    // Load the booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.travelerId !== travelerId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    // Enforce 30-day review window from completion date
    if (booking.completedAt) {
      const daysSinceCompletion =
        (Date.now() - new Date(booking.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCompletion > REVIEW_WINDOW_DAYS) {
        throw new BadRequestException(
          `Reviews must be submitted within ${REVIEW_WINDOW_DAYS} days of experience completion`
        );
      }
    }

    // Check for existing review (one per booking, enforced at DB level via unique constraint)
    const existing = await this.reviewRepo.findOne({ where: { bookingId: dto.bookingId } });
    if (existing) {
      throw new ConflictException('You have already submitted a review for this booking');
    }

    const review = await this.dataSource.transaction(async (manager: EntityManager) => {
      const newReview = manager.create(Review, {
        bookingId: dto.bookingId,
        experienceId: booking.experienceId,
        travelerId,
        guideId: booking.guideId,
        rating: dto.rating,
        comment: dto.comment ?? undefined,
        status: ReviewStatus.PUBLISHED,
      });

      const saved = await manager.save(Review, newReview);

      // Recalculate average rating for the experience
      const rawResult = (await manager
        .createQueryBuilder(Review, 'r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.experienceId = :expId', { expId: booking.experienceId })
        .andWhere('r.status = :status', { status: ReviewStatus.PUBLISHED })
        .getRawOne()) as { avg: string; count: string } | undefined;
      const { avg, count } = rawResult ?? { avg: '0', count: '0' };

      await manager.update(Experience, booking.experienceId, {
        averageRating: parseFloat(avg) || 0,
        reviewCount: parseInt(count, 10) || 0,
      });

      return saved;
    });

    this.logger.log(`Review ${review.id} created for booking ${dto.bookingId}`);
    return this.mapToDto(review);
  }

  async getExperienceReviews(
    experienceId: string,
    page: number,
    pageSize: number
  ): Promise<ReviewListResult> {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { experienceId, status: ReviewStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { reviews: reviews.map((r: Review) => this.mapToDto(r)), total, page, pageSize };
  }

  async getGuideReviews(guideId: string): Promise<ReviewDto[]> {
    const reviews = await this.reviewRepo.find({
      where: { guideId, status: ReviewStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
    return reviews.map((r: Review) => this.mapToDto(r));
  }

  async flagReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    if (review.status === ReviewStatus.REMOVED) {
      throw new ConflictException('Review has already been removed');
    }

    review.status = ReviewStatus.FLAGGED;
    await this.reviewRepo.save(review);
    this.logger.log(`Review ${reviewId} flagged by user ${userId}`);
  }

  async removeReview(reviewId: string, adminId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const previousStatus = review.status;
    review.status = ReviewStatus.REMOVED;
    await this.reviewRepo.save(review);

    // Recalculate average rating after removal
    if (previousStatus === ReviewStatus.PUBLISHED) {
      await this.recalculateRating(review.experienceId);
    }

    this.logger.log(`Review ${reviewId} removed by admin ${adminId}`);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async recalculateRating(experienceId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.experienceId = :experienceId', { experienceId })
      .andWhere('r.status = :status', { status: ReviewStatus.PUBLISHED })
      .getRawOne<{ avg: string; count: string }>();

    await this.experienceRepo.update(experienceId, {
      averageRating: parseFloat(result?.avg ?? '0') || 0,
      reviewCount: parseInt(result?.count ?? '0', 10) || 0,
    });
  }

  mapToDto(review: Review): ReviewDto {
    return {
      id: review.id,
      bookingId: review.bookingId,
      experienceId: review.experienceId,
      travelerId: review.travelerId,
      guideId: review.guideId,
      rating: review.rating,
      comment: review.comment ?? undefined,
      status: review.status as ReviewDto['status'],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
