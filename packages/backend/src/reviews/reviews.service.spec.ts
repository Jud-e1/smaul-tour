import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { Experience, CancellationPolicy } from '../database/entities/experience.entity';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    referenceNumber: 'AB12CD34',
    travelerId: 'traveler-1',
    experienceId: 'exp-1',
    guideId: 'guide-1',
    date: new Date('2026-01-01'),
    startTime: '09:00',
    endTime: '11:00',
    participants: 1,
    totalAmount: 50,
    totalCurrency: 'USD',
    status: BookingStatus.COMPLETED,
    cancellationPolicy: CancellationPolicy.MODERATE,
    paymentId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    completedAt: new Date('2026-01-02'),
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

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'review-1',
    bookingId: 'booking-1',
    experienceId: 'exp-1',
    travelerId: 'traveler-1',
    guideId: 'guide-1',
    rating: 5,
    comment: 'Great experience!',
    status: ReviewStatus.PUBLISHED,
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
    booking: null,
    experience: null,
    traveler: null,
    guide: null,
    ...overrides,
  } as Review;
}

// ─── Mock factories ──────────────────────────────────────────────────────────

function makeReviewRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

function makeBookingRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    ...overrides,
  };
}

function makeExperienceRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

/**
 * Builds a transaction mock that executes the callback with a manager
 * pre-configured to return the given avg/count from the query builder.
 */
function makeTransactionMock(review: Review, avgResult: { avg: string | null; count: string }) {
  return jest.fn().mockImplementation(async (cb: (m: any) => Promise<Review>) => {
    const qbMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(avgResult),
    };
    const manager = {
      create: jest.fn().mockReturnValue(review),
      save: jest.fn().mockResolvedValue(review),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };
    return cb(manager);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: ReturnType<typeof makeReviewRepo>;
  let bookingRepo: ReturnType<typeof makeBookingRepo>;
  let experienceRepo: ReturnType<typeof makeExperienceRepo>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    reviewRepo = makeReviewRepo();
    bookingRepo = makeBookingRepo();
    experienceRepo = makeExperienceRepo();
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Experience), useValue: experienceRepo },
        { provide: 'DataSource', useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  // ─── createReview ──────────────────────────────────────────────────────────

  describe('createReview', () => {
    it('should create a review and recalculate average rating', async () => {
      const booking = makeBooking();
      const review = makeReview();

      bookingRepo.findOne.mockResolvedValue(booking);
      reviewRepo.findOne.mockResolvedValue(null);
      dataSource.transaction = makeTransactionMock(review, { avg: '4.5', count: '3' });

      const result = await service.createReview('traveler-1', {
        bookingId: 'booking-1',
        rating: 5,
        comment: 'Great experience!',
      });

      expect(result.id).toBe('review-1');
      expect(result.rating).toBe(5);
      expect(result.status).toBe('published');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createReview('traveler-1', { bookingId: 'missing', rating: 4 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when traveler does not own the booking', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking({ travelerId: 'other-traveler' }));

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 4 })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking is not completed', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking({ status: BookingStatus.CONFIRMED }));

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 4 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when review window has expired (>30 days)', async () => {
      const oldCompletedAt = new Date();
      oldCompletedAt.setDate(oldCompletedAt.getDate() - 31);
      bookingRepo.findOne.mockResolvedValue(makeBooking({ completedAt: oldCompletedAt }));

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 4 })
      ).rejects.toThrow(BadRequestException);
    });

    // ─── Req 8.6: One review per booking ──────────────────────────────────────

    it('should throw ConflictException when review already exists for booking (one per booking)', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking());
      reviewRepo.findOne.mockResolvedValue(makeReview()); // existing review

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 3 })
      ).rejects.toThrow(ConflictException);
    });

    it('should allow a review when no prior review exists for the booking', async () => {
      const booking = makeBooking();
      const review = makeReview({ rating: 3 });

      bookingRepo.findOne.mockResolvedValue(booking);
      reviewRepo.findOne.mockResolvedValue(null); // no existing review
      dataSource.transaction = makeTransactionMock(review, { avg: '3.0', count: '1' });

      const result = await service.createReview('traveler-1', {
        bookingId: 'booking-1',
        rating: 3,
      });

      expect(result.bookingId).toBe('booking-1');
    });

    it('should store the review with the correct bookingId linking it to the booking', async () => {
      const booking = makeBooking({ id: 'booking-xyz' });
      const review = makeReview({ bookingId: 'booking-xyz' });

      bookingRepo.findOne.mockResolvedValue(booking);
      reviewRepo.findOne.mockResolvedValue(null);

      let capturedCreate: any;
      dataSource.transaction.mockImplementation(async (cb: (m: any) => Promise<Review>) => {
        const qbMock = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '5.0', count: '1' }),
        };
        const manager = {
          create: jest.fn().mockImplementation((_, data) => {
            capturedCreate = data;
            return review;
          }),
          save: jest.fn().mockResolvedValue(review),
          update: jest.fn().mockResolvedValue(undefined),
          createQueryBuilder: jest.fn().mockReturnValue(qbMock),
        };
        return cb(manager);
      });

      await service.createReview('traveler-1', { bookingId: 'booking-xyz', rating: 5 });

      expect(capturedCreate.bookingId).toBe('booking-xyz');
    });

    // ─── Req 8.4: Average rating recalculated on submission ───────────────────

    it('should update experience averageRating and reviewCount after creating a review', async () => {
      const booking = makeBooking();
      const review = makeReview({ rating: 4 });

      bookingRepo.findOne.mockResolvedValue(booking);
      reviewRepo.findOne.mockResolvedValue(null);

      let capturedUpdate: any;
      dataSource.transaction.mockImplementation(async (cb: (m: any) => Promise<Review>) => {
        const qbMock = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '4.2', count: '5' }),
        };
        const manager = {
          create: jest.fn().mockReturnValue(review),
          save: jest.fn().mockResolvedValue(review),
          update: jest.fn().mockImplementation((_, id, data) => {
            capturedUpdate = data;
            return Promise.resolve(undefined);
          }),
          createQueryBuilder: jest.fn().mockReturnValue(qbMock),
        };
        return cb(manager);
      });

      await service.createReview('traveler-1', { bookingId: 'booking-1', rating: 4 });

      expect(capturedUpdate).toMatchObject({ averageRating: 4.2, reviewCount: 5 });
    });
  });

  // ─── Req 8.2: Rating validation (1–5 stars) ───────────────────────────────

  describe('rating validation - Req 8.2', () => {
    /**
     * Validates: Requirements 8.2
     * The service stores and returns the rating exactly as provided.
     * Rating range enforcement (1-5) is handled by the DTO (class-validator @Min(1) @Max(5)).
     * These tests verify the service correctly preserves each valid star rating.
     */
    it.each([1, 2, 3, 4, 5])(
      'should accept and preserve valid rating of %i stars',
      async (rating) => {
        const booking = makeBooking();
        const review = makeReview({ rating });

        bookingRepo.findOne.mockResolvedValue(booking);
        reviewRepo.findOne.mockResolvedValue(null);
        dataSource.transaction = makeTransactionMock(review, {
          avg: String(rating),
          count: '1',
        });

        const result = await service.createReview('traveler-1', {
          bookingId: 'booking-1',
          rating,
        });

        expect(result.rating).toBe(rating);
      }
    );

    it('should map review rating to DTO without modification', () => {
      // Validates: Requirements 8.2 - rating is preserved exactly in the DTO
      const ratings = [1, 2, 3, 4, 5];
      for (const rating of ratings) {
        const review = makeReview({ rating });
        const dto = service.mapToDto(review);
        expect(dto.rating).toBe(rating);
      }
    });
  });

  // ─── Req 8.4: Average rating recalculation ────────────────────────────────

  describe('average rating recalculation - Req 8.4', () => {
    /**
     * Validates: Requirements 8.4
     * When a review is submitted, the experience's averageRating must be recalculated.
     * These tests verify the recalculation uses the correct formula and handles edge cases.
     */

    it('should recalculate average rating when a new review is submitted', async () => {
      const booking = makeBooking();
      const review = makeReview({ rating: 5 });

      bookingRepo.findOne.mockResolvedValue(booking);
      reviewRepo.findOne.mockResolvedValue(null);

      let updateArgs: any;
      dataSource.transaction.mockImplementation(async (cb: (m: any) => Promise<Review>) => {
        const qbMock = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '4.75', count: '4' }),
        };
        const manager = {
          create: jest.fn().mockReturnValue(review),
          save: jest.fn().mockResolvedValue(review),
          update: jest.fn().mockImplementation((_entity, _id, data) => {
            updateArgs = data;
            return Promise.resolve(undefined);
          }),
          createQueryBuilder: jest.fn().mockReturnValue(qbMock),
        };
        return cb(manager);
      });

      await service.createReview('traveler-1', { bookingId: 'booking-1', rating: 5 });

      expect(updateArgs.averageRating).toBe(4.75);
      expect(updateArgs.reviewCount).toBe(4);
    });

    it('should set averageRating to 0 and reviewCount to 0 when no published reviews remain after removal', async () => {
      const review = makeReview();
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, status: ReviewStatus.REMOVED });

      const qbMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null, count: '0' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(qbMock);
      experienceRepo.update.mockResolvedValue(undefined);

      await service.removeReview('review-1', 'admin-1');

      expect(experienceRepo.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({ averageRating: 0, reviewCount: 0 })
      );
    });

    it('should recalculate average rating after a review is removed', async () => {
      const review = makeReview();
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, status: ReviewStatus.REMOVED });

      const qbMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '3.5', count: '2' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(qbMock);
      experienceRepo.update.mockResolvedValue(undefined);

      await service.removeReview('review-1', 'admin-1');

      expect(experienceRepo.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({ averageRating: 3.5, reviewCount: 2 })
      );
    });

    /**
     * Validates: Requirements 8.4
     * Property: for any set of ratings, the stored average equals sum/count.
     * We simulate this by checking the service correctly passes the DB-computed avg to the update call.
     */
    it.each([
      { ratings: [5], expectedAvg: 5.0, expectedCount: 1 },
      { ratings: [1, 5], expectedAvg: 3.0, expectedCount: 2 },
      { ratings: [3, 4, 5], expectedAvg: 4.0, expectedCount: 3 },
      { ratings: [1, 2, 3, 4, 5], expectedAvg: 3.0, expectedCount: 5 },
      { ratings: [4, 4, 4, 4], expectedAvg: 4.0, expectedCount: 4 },
    ])(
      'should store correct average $expectedAvg for ratings $ratings',
      async ({ ratings, expectedAvg, expectedCount }) => {
        const booking = makeBooking();
        const review = makeReview({ rating: ratings[ratings.length - 1] });

        bookingRepo.findOne.mockResolvedValue(booking);
        reviewRepo.findOne.mockResolvedValue(null);

        let storedAvg: number | undefined;
        let storedCount: number | undefined;

        dataSource.transaction.mockImplementation(async (cb: (m: any) => Promise<Review>) => {
          const qbMock = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({
              avg: String(expectedAvg),
              count: String(expectedCount),
            }),
          };
          const manager = {
            create: jest.fn().mockReturnValue(review),
            save: jest.fn().mockResolvedValue(review),
            update: jest.fn().mockImplementation((_entity, _id, data) => {
              storedAvg = data.averageRating;
              storedCount = data.reviewCount;
              return Promise.resolve(undefined);
            }),
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
          };
          return cb(manager);
        });

        await service.createReview('traveler-1', {
          bookingId: 'booking-1',
          rating: ratings[ratings.length - 1],
        });

        expect(storedAvg).toBe(expectedAvg);
        expect(storedCount).toBe(expectedCount);
      }
    );

    it('should not recalculate average when a flagged (non-published) review is removed', async () => {
      const review = makeReview({ status: ReviewStatus.FLAGGED });
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, status: ReviewStatus.REMOVED });
      experienceRepo.update.mockResolvedValue(undefined);

      await service.removeReview('review-1', 'admin-1');

      // recalculateRating should NOT be called since the review was not PUBLISHED
      expect(experienceRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── Req 8.6: One review per booking ──────────────────────────────────────

  describe('one review per booking constraint - Req 8.6', () => {
    /**
     * Validates: Requirements 8.6
     * A traveler cannot submit more than one review for the same booking.
     */

    it('should reject a second review for the same booking with ConflictException', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking());
      reviewRepo.findOne.mockResolvedValue(makeReview()); // existing review

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 4 })
      ).rejects.toThrow(ConflictException);
    });

    it('should check for existing review using the bookingId', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking());
      reviewRepo.findOne.mockResolvedValue(makeReview());

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 5 })
      ).rejects.toThrow(ConflictException);

      expect(reviewRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { bookingId: 'booking-1' } })
      );
    });

    it('should allow reviews for different bookings by the same traveler', async () => {
      const booking2 = makeBooking({ id: 'booking-2', referenceNumber: 'XY98ZW76' });
      const review2 = makeReview({ id: 'review-2', bookingId: 'booking-2' });

      bookingRepo.findOne.mockResolvedValue(booking2);
      reviewRepo.findOne.mockResolvedValue(null); // no review for booking-2
      dataSource.transaction = makeTransactionMock(review2, { avg: '4.0', count: '2' });

      const result = await service.createReview('traveler-1', {
        bookingId: 'booking-2',
        rating: 3,
      });

      expect(result.bookingId).toBe('booking-2');
    });

    it('should include the duplicate review error message', async () => {
      bookingRepo.findOne.mockResolvedValue(makeBooking());
      reviewRepo.findOne.mockResolvedValue(makeReview());

      await expect(
        service.createReview('traveler-1', { bookingId: 'booking-1', rating: 2 })
      ).rejects.toThrow('already submitted a review');
    });
  });

  // ─── getExperienceReviews ──────────────────────────────────────────────────

  describe('getExperienceReviews', () => {
    it('should return paginated reviews ordered by most recent first', async () => {
      const reviews = [makeReview(), makeReview({ id: 'review-2', rating: 4 })];
      reviewRepo.findAndCount.mockResolvedValue([reviews, 2]);

      const result = await service.getExperienceReviews('exp-1', 1, 10);

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { experienceId: 'exp-1', status: ReviewStatus.PUBLISHED },
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 10,
        })
      );
    });

    it('should apply correct pagination offset', async () => {
      reviewRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.getExperienceReviews('exp-1', 3, 5);

      expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });
  });

  // ─── getGuideReviews ───────────────────────────────────────────────────────

  describe('getGuideReviews', () => {
    it('should return all published reviews for a guide', async () => {
      const reviews = [makeReview(), makeReview({ id: 'review-2' })];
      reviewRepo.find.mockResolvedValue(reviews);

      const result = await service.getGuideReviews('guide-1');

      expect(result).toHaveLength(2);
      expect(reviewRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guideId: 'guide-1', status: ReviewStatus.PUBLISHED },
          order: { createdAt: 'DESC' },
        })
      );
    });
  });

  // ─── flagReview ────────────────────────────────────────────────────────────

  describe('flagReview', () => {
    it('should flag a published review', async () => {
      const review = makeReview();
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, status: ReviewStatus.FLAGGED });

      await service.flagReview('review-1', 'user-1');

      expect(reviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.FLAGGED })
      );
    });

    it('should throw NotFoundException when review does not exist', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.flagReview('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when review is already removed', async () => {
      reviewRepo.findOne.mockResolvedValue(makeReview({ status: ReviewStatus.REMOVED }));

      await expect(service.flagReview('review-1', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  // ─── removeReview ──────────────────────────────────────────────────────────

  describe('removeReview', () => {
    it('should remove a review and recalculate average rating', async () => {
      const review = makeReview();
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, status: ReviewStatus.REMOVED });

      const qbMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '4.0', count: '2' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(qbMock);
      experienceRepo.update.mockResolvedValue(undefined);

      await service.removeReview('review-1', 'admin-1');

      expect(reviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.REMOVED })
      );
      expect(experienceRepo.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({ averageRating: 4.0, reviewCount: 2 })
      );
    });

    it('should throw NotFoundException when review does not exist', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.removeReview('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── mapToDto ──────────────────────────────────────────────────────────────

  describe('mapToDto', () => {
    it('should map all review fields to DTO correctly', () => {
      const review = makeReview({
        id: 'r-1',
        bookingId: 'b-1',
        experienceId: 'e-1',
        travelerId: 't-1',
        guideId: 'g-1',
        rating: 4,
        comment: 'Nice!',
        status: ReviewStatus.PUBLISHED,
      });

      const dto = service.mapToDto(review);

      expect(dto).toMatchObject({
        id: 'r-1',
        bookingId: 'b-1',
        experienceId: 'e-1',
        travelerId: 't-1',
        guideId: 'g-1',
        rating: 4,
        comment: 'Nice!',
        status: 'published',
      });
    });

    it('should map undefined comment when review has no comment', () => {
      const review = makeReview({ comment: null as any });
      const dto = service.mapToDto(review);
      expect(dto.comment).toBeUndefined();
    });
  });
});
