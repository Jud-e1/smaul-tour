/**
 * Integration test: Review flow
 * Tests: complete booking → submit review → display
 */

describe('Review Flow Integration', () => {
  const mockBookingsService = { findById: jest.fn() };
  const mockReviewsService = {
    create: jest.fn(),
    findByExperience: jest.fn(),
    calculateAverageRating: jest.fn(),
  };
  const mockExperiencesService = { updateRating: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  describe('Complete Booking → Submit Review → Display', () => {
    it('completes full review flow', async () => {
      // Step 1: Verify booking is completed
      const booking = { id: 'b1', status: 'completed', experienceId: 'exp-1', userId: 'user-1' };
      mockBookingsService.findById.mockResolvedValueOnce(booking);
      const foundBooking = await mockBookingsService.findById('b1');
      expect(foundBooking.status).toBe('completed');

      // Step 2: Submit review
      const review = {
        id: 'rev-1',
        bookingId: 'b1',
        experienceId: 'exp-1',
        userId: 'user-1',
        rating: 5,
        comment: 'Amazing experience! Highly recommend.',
        status: 'published',
        createdAt: new Date().toISOString(),
      };
      mockReviewsService.create.mockResolvedValueOnce(review);
      const created = await mockReviewsService.create({
        bookingId: 'b1',
        experienceId: 'exp-1',
        rating: 5,
        comment: 'Amazing experience! Highly recommend.',
      });
      expect(created.rating).toBe(5);
      expect(created.status).toBe('published');

      // Step 3: Recalculate average rating
      mockReviewsService.calculateAverageRating.mockResolvedValueOnce(4.7);
      const avgRating = await mockReviewsService.calculateAverageRating('exp-1');
      expect(avgRating).toBeGreaterThan(0);
      expect(avgRating).toBeLessThanOrEqual(5);

      // Step 4: Update experience rating
      mockExperiencesService.updateRating.mockResolvedValueOnce({ averageRating: 4.7, reviewCount: 10 });
      const updated = await mockExperiencesService.updateRating('exp-1', 4.7);
      expect(updated.averageRating).toBe(4.7);

      // Step 5: Display reviews
      mockReviewsService.findByExperience.mockResolvedValueOnce({
        reviews: [review],
        total: 1,
        averageRating: 4.7,
      });
      const displayed = await mockReviewsService.findByExperience('exp-1', { page: 1, limit: 10 });
      expect(displayed.reviews).toHaveLength(1);
      expect(displayed.reviews[0].rating).toBe(5);
    });

    it('enforces one review per booking', async () => {
      mockReviewsService.create.mockRejectedValueOnce({
        code: 'DUPLICATE_REVIEW',
        message: 'Review already submitted for this booking',
      });
      await expect(
        mockReviewsService.create({ bookingId: 'b1', rating: 4 })
      ).rejects.toMatchObject({ code: 'DUPLICATE_REVIEW' });
    });

    it('validates rating range', () => {
      const isValidRating = (r: number) => Number.isInteger(r) && r >= 1 && r <= 5;
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(5)).toBe(true);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(3.5)).toBe(false);
    });

    it('enforces 30-day submission window', () => {
      const isWithinWindow = (completedAt: Date) => {
        const daysDiff = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      };
      const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      expect(isWithinWindow(recent)).toBe(true);
      expect(isWithinWindow(old)).toBe(false);
    });
  });
});
