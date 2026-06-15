import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus as EntityStatus,
} from '../database/entities/notification.entity';
import {
  INotification,
  INotificationPreferences,
  INotificationService,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from './interfaces/notification.interfaces';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationQueueService, QueuedNotification } from './notification-queue.service';

const MAX_RETRY_ATTEMPTS = 3;

@Injectable()
export class NotificationsService implements INotificationService {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory preferences store (replace with DB entity for persistence)
  private preferencesStore = new Map<string, INotificationPreferences>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly templateService: NotificationTemplateService,
    private readonly queueService: NotificationQueueService
  ) {}

  /**
   * Send a notification via all requested channels, respecting user preferences.
   * Persists the notification and dispatches via email/push/in-app.
   */
  async sendNotification(
    notification: Omit<INotification, 'id' | 'createdAt'>
  ): Promise<INotification> {
    // Render content from template
    const rendered = this.templateService.render({
      type: notification.type,
      data: notification.data ?? {},
    });

    // Use rendered content if subject/body not explicitly provided
    const subject = notification.subject || rendered.subject;
    const body = notification.body || rendered.body;

    // Persist notification entity
    const entity = this.notificationRepository.create({
      userId: notification.userId,
      type: notification.type as string,
      channels: notification.channels as string[],
      priority: notification.priority as any,
      subject,
      body,
      data: notification.data,
      status: EntityStatus.PENDING,
    });
    const saved = await this.notificationRepository.save(entity);

    // Check user preferences and filter channels
    const prefs = await this.getPreferences(notification.userId);
    const allowedChannels = this.filterChannelsByPreferences(
      notification.channels,
      notification.type,
      prefs
    );

    if (allowedChannels.length === 0) {
      this.logger.debug(
        `All channels disabled by preferences for user ${notification.userId}, type ${notification.type}`
      );
      saved.status = EntityStatus.SENT;
      saved.sentAt = new Date();
      await this.notificationRepository.save(saved);
      return this.toInterface(saved);
    }

    // Enqueue for async delivery with retry support
    const queued: QueuedNotification = {
      notificationId: saved.id,
      userId: notification.userId,
      type: notification.type,
      channels: allowedChannels,
      subject,
      body,
      htmlBody: rendered.htmlBody,
      data: notification.data ?? {},
      attempt: 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      nextRetryAt: new Date(),
    };

    await this.queueService.enqueue(queued);

    // Process immediately (within 30 seconds requirement)
    await this.processQueuedNotification(queued, saved);

    return this.toInterface(saved);
  }

  /**
   * Process a queued notification with exponential backoff retry.
   */
  async processQueuedNotification(
    queued: QueuedNotification,
    entity?: Notification
  ): Promise<void> {
    const notifEntity =
      entity ??
      (await this.notificationRepository.findOne({ where: { id: queued.notificationId } }));
    if (!notifEntity) return;

    let success = true;

    for (const channel of queued.channels) {
      const channelSuccess = await this.dispatchChannel(channel as NotificationChannel, queued);
      if (!channelSuccess) {
        success = false;
      }
    }

    if (success) {
      notifEntity.status = EntityStatus.SENT;
      notifEntity.sentAt = new Date();
      await this.notificationRepository.save(notifEntity);
      this.logger.log(`Notification ${queued.notificationId} sent successfully`);
    } else if (queued.attempt < queued.maxAttempts) {
      // Schedule retry with exponential backoff
      const backoffMs = this.queueService.calculateBackoffMs(queued.attempt);
      this.logger.warn(
        `Notification ${queued.notificationId} failed on attempt ${queued.attempt}. Retrying in ${backoffMs}ms`
      );
      const retryQueued: QueuedNotification = {
        ...queued,
        attempt: queued.attempt + 1,
        nextRetryAt: new Date(Date.now() + backoffMs),
      };
      await this.queueService.enqueue(retryQueued);

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      (
        globalThis as typeof globalThis & { setTimeout: (fn: () => void, ms: number) => void }
      ).setTimeout(() => {
        this.processQueuedNotification(retryQueued).catch((err) =>
          this.logger.error(
            `Retry failed for notification ${queued.notificationId}: ${(err as Error).message}`
          )
        );
      }, backoffMs);
    } else {
      notifEntity.status = EntityStatus.FAILED;
      await this.notificationRepository.save(notifEntity);
      this.logger.error(
        `Notification ${queued.notificationId} failed after ${queued.maxAttempts} attempts`
      );
    }
  }

  private async dispatchChannel(
    channel: NotificationChannel,
    queued: QueuedNotification
  ): Promise<boolean> {
    try {
      switch (channel) {
        case 'email':
          return await this.dispatchEmail(queued);
        case 'push':
          return await this.dispatchPush(queued);
        case 'in_app':
          // In-app is handled by persisting the notification entity (already done)
          return true;
        default:
          return true;
      }
    } catch (err) {
      this.logger.error(`Channel ${channel} dispatch failed: ${(err as Error).message}`);
      return false;
    }
  }

  private async dispatchEmail(queued: QueuedNotification): Promise<boolean> {
    const userEmail = queued.data?.userEmail as string | undefined;
    if (!userEmail) {
      this.logger.warn(`No email address for user ${queued.userId}, skipping email channel`);
      return true; // Not a failure, just no email available
    }

    return this.emailService.sendEmail({
      to: userEmail,
      subject: queued.subject,
      text: queued.body,
      html: queued.htmlBody,
    });
  }

  private async dispatchPush(queued: QueuedNotification): Promise<boolean> {
    const deviceTokens = (queued.data?.deviceTokens as string[]) ?? [];
    if (deviceTokens.length === 0) {
      this.logger.debug(`No device tokens for user ${queued.userId}, skipping push channel`);
      return true;
    }

    return this.pushService.sendPush({
      title: queued.subject,
      body: queued.body,
      data: queued.data,
      deviceTokens,
    });
  }

  async getUserNotifications(
    userId: string,
    filters?: { unreadOnly?: boolean }
  ): Promise<INotification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (filters?.unreadOnly) {
      query.andWhere('n.status != :status', { status: EntityStatus.READ });
    }

    const results = await query.getMany();
    return results.map((r: Notification) => this.toInterface(r));
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    notification.status = EntityStatus.READ;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<INotificationPreferences>
  ): Promise<INotificationPreferences> {
    const existing = await this.getPreferences(userId);
    const updated: INotificationPreferences = {
      ...existing,
      ...preferences,
      userId,
      email: { ...existing.email, ...(preferences.email ?? {}) },
      push: { ...existing.push, ...(preferences.push ?? {}) },
      inApp: { ...existing.inApp, ...(preferences.inApp ?? {}) },
    };
    this.preferencesStore.set(userId, updated);
    return updated;
  }

  async getPreferences(userId: string): Promise<INotificationPreferences> {
    const stored = this.preferencesStore.get(userId);
    if (stored) return stored;

    return {
      userId,
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
      inApp: {
        all: true,
      },
    };
  }

  /**
   * Filter channels based on user preferences for the given notification type.
   */
  filterChannelsByPreferences(
    channels: NotificationChannel[],
    type: NotificationType,
    prefs: INotificationPreferences
  ): NotificationChannel[] {
    return channels.filter((channel) => {
      if (channel === 'in_app') {
        return prefs.inApp.all;
      }
      if (channel === 'email') {
        return this.isEmailEnabled(type, prefs);
      }
      if (channel === 'push') {
        return this.isPushEnabled(type, prefs);
      }
      return true;
    });
  }

  private isEmailEnabled(type: NotificationType, prefs: INotificationPreferences): boolean {
    switch (type) {
      case 'booking_confirmed':
        return prefs.email.bookingConfirmed;
      case 'booking_cancelled':
        return prefs.email.bookingCancelled;
      case 'payment_received':
        return prefs.email.paymentReceived;
      case 'itinerary_generated':
        return prefs.email.itineraryGenerated;
      case 'review_received':
        return prefs.email.reviewReceived;
      default:
        return true;
    }
  }

  private isPushEnabled(type: NotificationType, prefs: INotificationPreferences): boolean {
    switch (type) {
      case 'booking_confirmed':
        return prefs.push.bookingConfirmed;
      case 'booking_cancelled':
        return prefs.push.bookingCancelled;
      case 'payment_received':
        return prefs.push.paymentReceived;
      case 'new_booking':
        return prefs.push.newBooking;
      default:
        return true;
    }
  }

  private toInterface(entity: Notification): INotification {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type as NotificationType,
      channels: entity.channels as NotificationChannel[],
      priority: entity.priority as unknown as NotificationPriority,
      subject: entity.subject,
      body: entity.body,
      data: entity.data,
      status: entity.status as unknown as NotificationStatus,
      createdAt: entity.createdAt,
      sentAt: entity.sentAt ?? undefined,
      readAt: entity.readAt ?? undefined,
    };
  }
}
