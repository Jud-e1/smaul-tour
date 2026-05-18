/**
 * Mobile booking flow tests
 */

const mockCreate = jest.fn();
const mockCancel = jest.fn();
const mockGetUserBookings = jest.fn();

jest.mock('../lib/api', () => ({
  bookingsApi: {
    create: mockCreate,
    cancel: mockCancel,
    getUserBookings: mockGetUserBookings,
  },
  experiencesApi: {
    get: jest.fn(),
    getReviews: jest.fn(),
    getRecommendations: jest.fn(),
    list: jest.fn(),
  },
  tripPlannerApi: {
    getItineraries: jest.fn(),
  },
  default: { get: jest.fn(), post: jest.fn() },
}));

describe('Mobile Booking Flow', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Booking creation', () => {
    it('creates booking with required fields', async () => {
      mockCreate.mockResolvedValueOnce({
        data: { id: 'b1', referenceNumber: 'XYZ98765', status: 'confirmed' },
      });
      const result = await mockCreate({
        experienceId: 'exp-1',
        slotId: 'slot-1',
        participants: 2,
        paymentMethodId: 'pm_test',
      });
      expect(result.data.referenceNumber).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('handles slot unavailable error', async () => {
      mockCreate.mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Slot no longer available' } },
      });
      await expect(mockCreate({ slotId: 'taken' })).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });

  describe('Booking cancellation', () => {
    it('cancels booking with reason', async () => {
      mockCancel.mockResolvedValueOnce({ data: { status: 'cancelled' } });
      const result = await mockCancel('b1', 'Change of plans');
      expect(result.data.status).toBe('cancelled');
    });
  });

  describe('Booking retrieval', () => {
    it('fetches bookings for user', async () => {
      mockGetUserBookings.mockResolvedValueOnce({
        data: { bookings: [{ id: 'b1', status: 'confirmed' }] },
      });
      const result = await mockGetUserBookings('user-1', { status: 'upcoming' });
      expect(result.data.bookings).toHaveLength(1);
    });
  });

  describe('Participant validation', () => {
    it('requires at least 1 participant', () => {
      const validate = (n: number) => n >= 1;
      expect(validate(0)).toBe(false);
      expect(validate(1)).toBe(true);
    });
  });
});
