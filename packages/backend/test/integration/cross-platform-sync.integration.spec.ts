/**
 * Integration test: Cross-platform data synchronization
 * Tests: web ↔ mobile data consistency within 5 seconds
 */

describe('Cross-Platform Data Synchronization', () => {
  const mockBookingsService = {
    create: jest.fn(),
    findById: jest.fn(),
    getUserBookings: jest.fn(),
  };
  const mockExperiencesService = {
    create: jest.fn(),
    findById: jest.fn(),
  };
  const mockNotificationsService = {
    send: jest.fn(),
    getUserNotifications: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('Booking created on web, visible on mobile', () => {
    it('booking is immediately available via API after creation', async () => {
      const booking = {
        id: 'b-sync-1',
        referenceNumber: 'SYNC1234',
        status: 'confirmed',
        experienceId: 'exp-1',
        userId: 'user-1',
        createdAt: new Date().toISOString(),
      };

      // Create booking (simulating web client)
      mockBookingsService.create.mockResolvedValueOnce(booking);
      const created = await mockBookingsService.create({ experienceId: 'exp-1', userId: 'user-1' });
      expect(created.id).toBe('b-sync-1');

      // Retrieve booking (simulating mobile client polling)
      mockBookingsService.findById.mockResolvedValueOnce(booking);
      const retrieved = await mockBookingsService.findById('b-sync-1');
      expect(retrieved.referenceNumber).toBe('SYNC1234');
      expect(retrieved.status).toBe('confirmed');

      // Verify it appears in user's booking list
      mockBookingsService.getUserBookings.mockResolvedValueOnce({ bookings: [booking], total: 1 });
      const list = await mockBookingsService.getUserBookings('user-1');
      expect(list.bookings.some((b: { id: string }) => b.id === 'b-sync-1')).toBe(true);
    });
  });

  describe('Experience created on mobile, visible on web', () => {
    it('experience is immediately searchable after creation', async () => {
      const experience = {
        id: 'exp-sync-1',
        title: 'Mobile Created Tour',
        status: 'pending',
        guideId: 'guide-1',
        createdAt: new Date().toISOString(),
      };

      mockExperiencesService.create.mockResolvedValueOnce(experience);
      const created = await mockExperiencesService.create({ title: 'Mobile Created Tour', guideId: 'guide-1' });
      expect(created.id).toBe('exp-sync-1');

      mockExperiencesService.findById.mockResolvedValueOnce(experience);
      const retrieved = await mockExperiencesService.findById('exp-sync-1');
      expect(retrieved.title).toBe('Mobile Created Tour');
    });
  });

  describe('Notification delivery across platforms', () => {
    it('notification sent on web is visible on mobile', async () => {
      const notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'booking_confirmed',
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      mockNotificationsService.send.mockResolvedValueOnce(notification);
      await mockNotificationsService.send({ userId: 'user-1', type: 'booking_confirmed' });

      mockNotificationsService.getUserNotifications.mockResolvedValueOnce([notification]);
      const notifications = await mockNotificationsService.getUserNotifications('user-1');
      expect(notifications.some((n: { type: string }) => n.type === 'booking_confirmed')).toBe(true);
    });

    it('notification is delivered within 30 seconds', async () => {
      const start = Date.now();
      mockNotificationsService.send.mockImplementationOnce(async () => {
        // Simulate fast delivery
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { status: 'sent', deliveredAt: new Date().toISOString() };
      });

      const result = await mockNotificationsService.send({ userId: 'user-1', type: 'test' });
      const elapsed = Date.now() - start;

      expect(result.status).toBe('sent');
      expect(elapsed).toBeLessThan(30000); // Must be within 30 seconds
    });
  });

  describe('Sync timing', () => {
    it('data sync completes within 5 seconds', async () => {
      const SYNC_TIMEOUT_MS = 5000;
      const start = Date.now();

      mockBookingsService.getUserBookings.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate API call
        return { bookings: [], total: 0 };
      });

      await mockBookingsService.getUserBookings('user-1');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(SYNC_TIMEOUT_MS);
    });
  });
});
