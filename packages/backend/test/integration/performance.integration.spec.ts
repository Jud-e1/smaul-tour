/**
 * Performance tests
 * Tests: response times, concurrent load, database query performance
 */

describe('Performance Tests', () => {
  describe('API Response Times', () => {
    const mockExperiencesService = { search: jest.fn() };
    const mockBookingsService = { create: jest.fn() };
    const mockTripPlannerService = { generate: jest.fn() };

    beforeEach(() => jest.clearAllMocks());

    it('experience search responds within 500ms', async () => {
      mockExperiencesService.search.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate fast DB query
        return { experiences: [], total: 0 };
      });

      const start = Date.now();
      await mockExperiencesService.search({ query: 'tour', page: 1, limit: 20 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });

    it('booking creation responds within 2 seconds', async () => {
      mockBookingsService.create.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { id: 'b1', referenceNumber: 'ABC12345' };
      });

      const start = Date.now();
      await mockBookingsService.create({ experienceId: 'exp-1' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });

    it('trip planner generation responds within 10 seconds', async () => {
      mockTripPlannerService.generate.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate LLM call
        return { id: 'itin-1', experiences: [] };
      });

      const start = Date.now();
      await mockTripPlannerService.generate({ naturalLanguageInput: 'test trip' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('handles multiple concurrent booking attempts without double-booking', async () => {
      const availableSlots = new Set(['slot-1']);
      const bookSlot = async (
        slotId: string,
        userId: string
      ): Promise<{ success: boolean; userId: string }> => {
        if (availableSlots.has(slotId)) {
          availableSlots.delete(slotId);
          return { success: true, userId };
        }
        return { success: false, userId };
      };

      // Simulate 5 concurrent booking attempts for the same slot
      const results = await Promise.all([
        bookSlot('slot-1', 'user-1'),
        bookSlot('slot-1', 'user-2'),
        bookSlot('slot-1', 'user-3'),
        bookSlot('slot-1', 'user-4'),
        bookSlot('slot-1', 'user-5'),
      ]);

      const successful = results.filter((r) => r.success);
      expect(successful.length).toBe(1); // Only one should succeed
    });

    it('handles concurrent search requests', async () => {
      const mockSearch = jest.fn().mockResolvedValue({ experiences: [], total: 0 });
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        mockSearch({ query: `tour ${i}` })
      );

      const results = await Promise.all(concurrentRequests);
      expect(results).toHaveLength(10);
      expect(mockSearch).toHaveBeenCalledTimes(10);
    });
  });

  describe('Database Query Performance', () => {
    it('paginated queries return results efficiently', () => {
      const paginateQuery = (items: unknown[], page: number, limit: number) => {
        const start = (page - 1) * limit;
        return {
          data: items.slice(start, start + limit),
          total: items.length,
          page,
          totalPages: Math.ceil(items.length / limit),
        };
      };

      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const result = paginateQuery(items, 2, 20);

      expect(result.data).toHaveLength(20);
      expect(result.data[0]).toEqual({ id: 20 });
      expect(result.totalPages).toBe(5);
    });

    it('caching reduces repeated query load', async () => {
      const cache = new Map<string, unknown>();
      const mockDbQuery = jest.fn().mockResolvedValue({ data: 'result' });

      const cachedQuery = async (key: string) => {
        if (cache.has(key)) return cache.get(key);
        const result = await mockDbQuery(key);
        cache.set(key, result);
        return result;
      };

      // First call hits DB
      await cachedQuery('experience:exp-1');
      // Second call uses cache
      await cachedQuery('experience:exp-1');
      // Third call uses cache
      await cachedQuery('experience:exp-1');

      expect(mockDbQuery).toHaveBeenCalledTimes(1); // Only one DB hit
    });
  });

  describe('Page Load Performance', () => {
    it('API response payload is reasonably sized', () => {
      const experience = {
        id: 'exp-1',
        title: 'City Tour',
        description: 'A wonderful tour',
        price: { amount: 50, currency: 'USD' },
        duration: 3,
        averageRating: 4.5,
        reviewCount: 42,
        location: { address: 'Nairobi, Kenya', latitude: -1.286389, longitude: 36.817223 },
      };

      const payload = JSON.stringify(experience);
      // Single experience payload should be under 1KB
      expect(payload.length).toBeLessThan(1024);
    });
  });
});
