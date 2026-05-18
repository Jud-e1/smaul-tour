import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    const mockConfigService = { get: jest.fn().mockReturnValue('') };
    service = new LocationService(mockConfigService as any);
  });

  // ─── calculateHaversineDistance() ────────────────────────────────────────

  describe('calculateHaversineDistance', () => {
    it('should return approximately 0 for same coordinates', () => {
      const dist = service.calculateHaversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(dist).toBeCloseTo(0, 5);
    });

    it('should return approximately 111 km for 1 degree latitude difference', () => {
      const dist = service.calculateHaversineDistance(0, 0, 1, 0);
      expect(dist).toBeCloseTo(111, 0);
    });

    it('should return a positive number for any two different coordinates', () => {
      const dist = service.calculateHaversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
      expect(dist).toBeGreaterThan(0);
    });
  });

  // ─── getDistance() — no API key configured ────────────────────────────────

  describe('getDistance (no API key)', () => {
    it('should fall back to Haversine when apiKey is empty', async () => {
      const result = await service.getDistance(40.7128, -74.006, 48.8566, 2.3522);
      // Haversine distance between NYC and Paris is ~5837 km
      expect(result.distanceKm).toBeGreaterThan(0);
    });

    it('should return distanceKm > 0 for different coordinates', async () => {
      const result = await service.getDistance(0, 0, 1, 1);
      expect(result.distanceKm).toBeGreaterThan(0);
    });

    it('should return durationMinutes > 0 for different coordinates', async () => {
      const result = await service.getDistance(0, 0, 1, 1);
      expect(result.durationMinutes).toBeGreaterThan(0);
    });
  });

  // ─── calculateTravelTimes() ───────────────────────────────────────────────

  describe('calculateTravelTimes', () => {
    it('should return empty array for single location (no pairs)', async () => {
      const result = await service.calculateTravelTimes([{ id: 'a', lat: 0, lng: 0 }]);
      expect(result).toEqual([]);
    });

    it('should return one result for two locations', async () => {
      const result = await service.calculateTravelTimes([
        { id: 'a', lat: 0, lng: 0 },
        { id: 'b', lat: 1, lng: 1 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].fromId).toBe('a');
      expect(result[0].toId).toBe('b');
    });

    it('should return n-1 results for n locations', async () => {
      const locations = [
        { id: 'a', lat: 0, lng: 0 },
        { id: 'b', lat: 1, lng: 0 },
        { id: 'c', lat: 2, lng: 0 },
        { id: 'd', lat: 3, lng: 0 },
      ];
      const result = await service.calculateTravelTimes(locations);
      expect(result).toHaveLength(3);
    });
  });
});
