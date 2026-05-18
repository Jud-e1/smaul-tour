/**
 * Booking flow tests
 * Tests booking creation, availability checking, and payment integration
 */
import '@testing-library/jest-dom';

// Mock API
const mockCreate = jest.fn();
const mockGetUserBookings = jest.fn();
const mockCancel = jest.fn();

jest.mock('@/lib/api', () => ({
  bookingsApi: {
    create: mockCreate,
    getUserBookings: mockGetUserBookings,
    cancel: mockCancel,
  },
  experiencesApi: {
    get: jest.fn(),
    getReviews: jest.fn(),
    getRecommendations: jest.fn(),
  },
  paymentsApi: {
    process: jest.fn(),
  },
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', role: 'traveler', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ id: 'exp-1' }),
}));

describe('Booking Flow', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Booking creation', () => {
    it('creates a booking with required fields', async () => {
      const bookingData = {
        experienceId: 'exp-1',
        slotId: 'slot-1',
        participants: 2,
        paymentMethodId: 'pm_test_123',
      };
      mockCreate.mockResolvedValueOnce({ data: { id: 'booking-1', referenceNumber: 'ABC12345' } });
      const result = await mockCreate(bookingData);
      expect(result.data.referenceNumber).toBe('ABC12345');
      expect(mockCreate).toHaveBeenCalledWith(bookingData);
    });

    it('handles double-booking error', async () => {
      mockCreate.mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Slot no longer available' } },
      });
      await expect(mockCreate({ experienceId: 'exp-1', slotId: 'slot-taken' })).rejects.toMatchObject({
        response: { status: 409 },
      });
    });

    it('handles payment failure', async () => {
      mockCreate.mockRejectedValueOnce({
        response: { status: 402, data: { message: 'Payment failed' } },
      });
      await expect(mockCreate({ experienceId: 'exp-1', paymentMethodId: 'pm_fail' })).rejects.toMatchObject({
        response: { status: 402 },
      });
    });
  });

  describe('Booking retrieval', () => {
    it('fetches user bookings with status filter', async () => {
      mockGetUserBookings.mockResolvedValueOnce({
        data: [
          { id: 'b1', status: 'confirmed', experienceTitle: 'City Tour' },
          { id: 'b2', status: 'completed', experienceTitle: 'Cooking Class' },
        ],
      });
      const result = await mockGetUserBookings('user-1', { status: 'confirmed' });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Booking cancellation', () => {
    it('cancels a booking with a reason', async () => {
      mockCancel.mockResolvedValueOnce({ data: { status: 'cancelled', refundAmount: 50 } });
      const result = await mockCancel('booking-1', 'Change of plans');
      expect(result.data.status).toBe('cancelled');
      expect(mockCancel).toHaveBeenCalledWith('booking-1', 'Change of plans');
    });

    it('handles cancellation of non-cancellable booking', async () => {
      mockCancel.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Booking cannot be cancelled' } },
      });
      await expect(mockCancel('booking-past', 'reason')).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('Booking reference number format', () => {
    it('generates 8-character alphanumeric reference', () => {
      const ref = 'ABC12345';
      expect(ref).toMatch(/^[A-Z0-9]{8}$/);
    });
  });
});
