import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationQueueService } from './notification-queue.service';
import { Notification, NotificationStatus as EntityStatus } from '../database/entities/notification.entity';
import {
  INotification,
  INotificationPreferences,
  NotificationChannel,
  NotificationType,
} from './interfaces/notification.interfaces';

const mockNotificationRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockEmailService = () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
});

const mockPushService = () => ({
  sendPush: jest.fn().mockResolvedValue(true),
});

const mockQueueService = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
  dequeue: jest.fn().mockResolvedValue(null),
  size: jest.fn().mockResolvedValue(0),
  calculateBackoffMs: jest.fn().mockReturnValue(1000),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<Repository<Notification>>;
  let emailService: jest.Mocked<EmailService>;
  let pushService: jest.Mocked<PushService>;
  let queueService: jest.Mocked<NotificationQueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTemplateService,
        { provide: getRepositoryToken(Notification), useFactory: mockNotificationRepo },
        { provide: EmailService, useFactory: mockEmailService },
        { provide: PushService, useFactory: mockPushService },
        { provide: NotificationQueueService, useFactory: mockQueueService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get(getRepositoryToken(Notification));
    emailService = module.get(EmailService);
    pushService = module.get(PushService);
    queueService = module.get(NotificationQueueService);
  });

  describe('sendNotification', () => {
    it('should persist notification and enqueue for delivery', async () => {
      const savedEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'booking_confirmed',
        channels: ['email', 'in_app'],
        priority: 'high',
        subject: 'Booking Confirmed – Test Experience',
        body: 'Your booking has been confirmed.',
        data: { referenceNumber: 'ABC12345', experienceName: 'Test Experience', date: '2024-06-01' },
        status: EntityStatus.PENDING,
        createdAt: new Date(),
        sentAt: null,
        readAt: null,
      } as unknown as Notification;

      repo.create.mockReturnValue(savedEntity);
      repo.save.mockResolvedValue({ ...savedEntity, status: EntityStatus.SENT, sentAt: new Date() } as Notification);

      const result = await service.sendNotification({
        userId: 'user-1',
        type: 'booking_confirmed',
        channels: ['email', 'in_app'],
        priority: 'high',
        subject: '',
        body: '',
        status: 'pending',
        data: { referenceNumber: 'ABC12345', experienceName: 'Test Experience', date: '2024-06-01' },
      });

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(queueService.enqueue).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
      expect(result.type).toBe('booking_confirmed');
    });

    it('should use template engine to render subject and body', async () => {
      const savedEntity = {
        id: 'notif-2',
        userId: 'user-2',
        type: 'itinerary_generated',
        channels: ['email'],
        priority: 'normal',
        subject: 'Your Itinerary is Ready!',
        body: 'Your personalized travel itinerary has been generated.',
        data: { itineraryId: 'itin-1', itineraryLink: '/itineraries/itin-1' },
        status: EntityStatus.PENDING,
        createdAt: new Date(),
        sentAt: null,
        readAt: null,
      } as unknown as Notification;

      repo.create.mockReturnValue(savedEntity);
      repo.save.mockResolvedValue({ ...savedEntity, status: EntityStatus.SENT } as Notification);

      await service.sendNotification({
        userId: 'user-2',
        type: 'itinerary_generated',
        channels: ['email'],
        priority: 'normal',
        subject: '',
        body: '',
        status: 'pending',
        data: { itineraryId: 'itin-1', itineraryLink: '/itineraries/itin-1' },
      });

      // The create call should have a non-empty subject from the template
      const createCall = repo.create.mock.calls[0][0] as any;
      expect(createCall.subject).toBeTruthy();
      expect(createCall.subject).toContain('Itinerary');
    });
  });

  describe('filterChannelsByPreferences', () => {
    const defaultPrefs: INotificationPreferences = {
      userId: 'user-1',
      email: {
        bookingConfirmed: true,
        bookingCancelled: true,
        paymentReceived: true,
        itineraryGenerated: true,
        reviewReceived: true,
      },
      push: {
        bookingConfirmed: true,
        bookingCancelled: true,
        paymentReceived: true,
        newBooking: true,
      },
      inApp: { all: true },
    };

    it('should return all channels when all preferences are enabled', () => {
      const channels: NotificationChannel[] = ['email', 'push', 'in_app'];
      const result = service.filterChannelsByPreferences(channels, 'booking_confirmed', defaultPrefs);
      expect(result).toEqual(['email', 'push', 'in_app']);
    });

    it('should filter out email when email preference is disabled', () => {
      const prefs: INotificationPreferences = {
        ...defaultPrefs,
        email: { ...defaultPrefs.email, bookingConfirmed: false },
      };
      const channels: NotificationChannel[] = ['email', 'in_app'];
      const result = service.filterChannelsByPreferences(channels, 'booking_confirmed', prefs);
      expect(result).not.toContain('email');
      expect(result).toContain('in_app');
    });

    it('should filter out push when push preference is disabled', () => {
      const prefs: INotificationPreferences = {
        ...defaultPrefs,
        push: { ...defaultPrefs.push, newBooking: false },
      };
      const channels: NotificationChannel[] = ['push', 'in_app'];
      const result = service.filterChannelsByPreferences(channels, 'new_booking', prefs);
      expect(result).not.toContain('push');
    });

    it('should filter out in_app when inApp.all is false', () => {
      const prefs: INotificationPreferences = {
        ...defaultPrefs,
        inApp: { all: false },
      };
      const channels: NotificationChannel[] = ['email', 'in_app'];
      const result = service.filterChannelsByPreferences(channels, 'booking_confirmed', prefs);
      expect(result).not.toContain('in_app');
    });

    it('should return empty array when all channels are disabled', () => {
      const prefs: INotificationPreferences = {
        ...defaultPrefs,
        email: { ...defaultPrefs.email, bookingCancelled: false },
        push: { ...defaultPrefs.push, bookingCancelled: false },
        inApp: { all: false },
      };
      const channels: NotificationChannel[] = ['email', 'push', 'in_app'];
      const result = service.filterChannelsByPreferences(channels, 'booking_cancelled', prefs);
      expect(result).toHaveLength(0);
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for a user ordered by createdAt DESC', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'n1',
            userId: 'user-1',
            type: 'booking_confirmed',
            channels: ['in_app'],
            priority: 'high',
            subject: 'Booking Confirmed',
            body: 'Your booking is confirmed.',
            data: {},
            status: EntityStatus.SENT,
            createdAt: new Date(),
            sentAt: new Date(),
            readAt: null,
          },
        ]),
      };
      repo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getUserNotifications('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.getUserNotifications('user-1', { unreadOnly: true });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: EntityStatus.READ }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read and set readAt', async () => {
      const notification = {
        id: 'notif-1',
        status: EntityStatus.SENT,
        readAt: null,
      } as unknown as Notification;

      repo.findOne.mockResolvedValue(notification);
      repo.save.mockResolvedValue({ ...notification, status: EntityStatus.READ, readAt: new Date() } as Notification);

      await service.markAsRead('notif-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EntityStatus.READ }),
      );
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.markAsRead('nonexistent')).rejects.toThrow('Notification nonexistent not found');
    });
  });

  describe('updatePreferences', () => {
    it('should update and return merged preferences', async () => {
      const result = await service.updatePreferences('user-1', {
        email: { bookingConfirmed: false } as any,
      });

      expect(result.userId).toBe('user-1');
      expect(result.email.bookingConfirmed).toBe(false);
      // Other defaults should remain
      expect(result.email.bookingCancelled).toBe(true);
    });

    it('should persist preferences for subsequent getPreferences calls', async () => {
      await service.updatePreferences('user-persist', {
        push: { newBooking: false } as any,
      });

      const prefs = await service.getPreferences('user-persist');
      expect(prefs.push.newBooking).toBe(false);
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences for new users', async () => {
      const prefs = await service.getPreferences('new-user-xyz');
      expect(prefs.email.bookingConfirmed).toBe(true);
      expect(prefs.push.newBooking).toBe(true);
      expect(prefs.inApp.all).toBe(true);
    });
  });

  describe('retry logic', () => {
    it('should retry failed notifications with exponential backoff', async () => {
      const backoff1 = queueService.calculateBackoffMs(1);
      const backoff2 = queueService.calculateBackoffMs(2);
      const backoff3 = queueService.calculateBackoffMs(3);

      // Verify backoff increases (mocked to return 1000 always, but we test the real service)
      const realQueueService = new NotificationQueueService(
        { get: jest.fn() } as any,
        null,
      );
      expect(realQueueService.calculateBackoffMs(1)).toBe(1000);
      expect(realQueueService.calculateBackoffMs(2)).toBe(2000);
      expect(realQueueService.calculateBackoffMs(3)).toBe(4000);
      expect(realQueueService.calculateBackoffMs(10)).toBe(30000); // capped at 30s
    });
  });
});

describe('NotificationTemplateService', () => {
  let templateService: NotificationTemplateService;

  beforeEach(() => {
    templateService = new NotificationTemplateService();
  });

  it('should render booking_confirmed template', () => {
    const result = templateService.render({
      type: 'booking_confirmed',
      data: { referenceNumber: 'ABC123', experienceName: 'City Tour', date: '2024-06-01' },
    });
    expect(result.subject).toContain('City Tour');
    expect(result.body).toContain('ABC123');
    expect(result.htmlBody).toBeDefined();
  });

  it('should render booking_cancelled template with refund info', () => {
    const result = templateService.render({
      type: 'booking_cancelled',
      data: { referenceNumber: 'XYZ789', experienceName: 'Food Tour', refundAmount: 50, refundCurrency: 'USD' },
    });
    expect(result.subject).toContain('Food Tour');
    expect(result.body).toContain('50');
  });

  it('should render payment_received template', () => {
    const result = templateService.render({
      type: 'payment_received',
      data: { amount: 100, currency: 'USD', transactionId: 'TXN-001' },
    });
    expect(result.subject).toContain('Payment');
    expect(result.body).toContain('100');
    expect(result.body).toContain('TXN-001');
  });

  it('should render itinerary_generated template with link', () => {
    const result = templateService.render({
      type: 'itinerary_generated',
      data: { itineraryLink: '/itineraries/abc' },
    });
    expect(result.subject).toContain('Itinerary');
    expect(result.body).toContain('/itineraries/abc');
    expect(result.htmlBody).toContain('/itineraries/abc');
  });

  it('should render new_booking template for guides', () => {
    const result = templateService.render({
      type: 'new_booking',
      data: { referenceNumber: 'REF001', experienceName: 'Hiking', date: '2024-07-15', travelerName: 'John Doe' },
    });
    expect(result.subject).toContain('Hiking');
    expect(result.body).toContain('John Doe');
  });
});
