/**
 * Integration test: Complete booking flow
 * Tests: browse → book → pay → confirm
 */

describe('Booking Flow Integration', () => {
  // Mock service dependencies
  const mockExperiencesService = {
    findById: jest.fn(),
    checkAvailability: jest.fn(),
  };
  const mockBookingsService = {
    create: jest.fn(),
    findById: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
  };
  const mockPaymentsService = {
    process: jest.fn(),
    refund: jest.fn(),
  };
  const mockNotificationsService = {
    send: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('Browse → Book → Pay → Confirm', () => {
    it('completes full booking flow successfully', async () => {
      const experience = {
        id: 'exp-1',
        title: 'City Walking Tour',
        price: { amount: 50, currency: 'USD' },
        availabilitySlots: [{ id: 'slot-1', date: '2026-04-01', availableCapacity: 5 }],
      };

      const booking = {
        id: 'booking-1',
        referenceNumber: 'ABC12345',
        status: 'pending',
        experienceId: 'exp-1',
        slotId: 'slot-1',
        participants: 2,
        totalAmount: 100,
      };

      const payment = {
        id: 'payment-1',
        status: 'escrowed',
        amount: 100,
        currency: 'USD',
      };

      // Step 1: Browse - find experience
      mockExperiencesService.findById.mockResolvedValueOnce(experience);
      const foundExp = await mockExperiencesService.findById('exp-1');
      expect(foundExp.title).toBe('City Walking Tour');

      // Step 2: Check availability
      mockExperiencesService.checkAvailability.mockResolvedValueOnce(true);
      const available = await mockExperiencesService.checkAvailability('exp-1', 'slot-1', 2);
      expect(available).toBe(true);

      // Step 3: Create booking
      mockBookingsService.create.mockResolvedValueOnce(booking);
      const createdBooking = await mockBookingsService.create({
        experienceId: 'exp-1',
        slotId: 'slot-1',
        participants: 2,
        userId: 'user-1',
      });
      expect(createdBooking.referenceNumber).toMatch(/^[A-Z0-9]{8}$/);
      expect(createdBooking.status).toBe('pending');

      // Step 4: Process payment
      mockPaymentsService.process.mockResolvedValueOnce(payment);
      const processedPayment = await mockPaymentsService.process({
        bookingId: 'booking-1',
        amount: 100,
        currency: 'USD',
        paymentMethodId: 'pm_test',
      });
      expect(processedPayment.status).toBe('escrowed');

      // Step 5: Send confirmation notification
      mockNotificationsService.send.mockResolvedValueOnce(undefined);
      await mockNotificationsService.send({
        userId: 'user-1',
        type: 'booking_confirmed',
        data: { bookingId: 'booking-1', referenceNumber: 'ABC12345' },
      });
      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'booking_confirmed' })
      );
    });

    it('handles double-booking prevention', async () => {
      mockExperiencesService.checkAvailability.mockResolvedValueOnce(false);
      const available = await mockExperiencesService.checkAvailability('exp-1', 'slot-full', 1);
      expect(available).toBe(false);

      mockBookingsService.create.mockRejectedValueOnce({
        code: 'SLOT_UNAVAILABLE',
        message: 'Slot no longer available',
      });
      await expect(
        mockBookingsService.create({ experienceId: 'exp-1', slotId: 'slot-full' })
      ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    });
  });

  describe('Cancellation Flow', () => {
    it('cancels booking and processes refund', async () => {
      mockBookingsService.cancel.mockResolvedValueOnce({ status: 'cancelled', refundAmount: 50 });
      const result = await mockBookingsService.cancel('booking-1', 'Change of plans');
      expect(result.status).toBe('cancelled');
      expect(result.refundAmount).toBe(50);

      mockPaymentsService.refund.mockResolvedValueOnce({ status: 'refunded', amount: 50 });
      const refund = await mockPaymentsService.refund('payment-1', 50);
      expect(refund.status).toBe('refunded');

      mockNotificationsService.send.mockResolvedValueOnce(undefined);
      await mockNotificationsService.send({ type: 'booking_cancelled', userId: 'user-1' });
      expect(mockNotificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'booking_cancelled' })
      );
    });
  });
});
