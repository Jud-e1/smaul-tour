import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannel } from './interfaces/notification.interfaces';

export interface BookingNotificationData {
  bookingId: string;
  referenceNumber: string;
  experienceName: string;
  date: string;
  travelerId: string;
  travelerName?: string;
  travelerEmail?: string;
  travelerDeviceTokens?: string[];
  guideId: string;
  guideName?: string;
  guideEmail?: string;
  guideDeviceTokens?: string[];
  totalAmount?: number;
  totalCurrency?: string;
  refundAmount?: number;
  refundCurrency?: string;
  cancellationReason?: string;
}

export interface PaymentNotificationData {
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: string;
  travelerId: string;
  travelerEmail?: string;
  travelerDeviceTokens?: string[];
  bookingId: string;
  experienceName?: string;
}

/**
 * Service that sends notifications for booking lifecycle events.
 * Integrates with the booking service to send confirmations, cancellations, etc.
 */
@Injectable()
export class BookingNotificationsService {
  private readonly logger = new Logger(BookingNotificationsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Send booking confirmation to both traveler and guide.
   * Requirement 4.6, 10.1, 10.2
   */
  async sendBookingConfirmation(data: BookingNotificationData): Promise<void> {
    const travelerChannels: NotificationChannel[] = ['email', 'in_app'];
    const guideChannels: NotificationChannel[] = ['email', 'push', 'in_app'];

    const notificationData = {
      bookingId: data.bookingId,
      referenceNumber: data.referenceNumber,
      experienceName: data.experienceName,
      date: data.date,
    };

    // Notify traveler
    await this.notificationsService.sendNotification({
      userId: data.travelerId,
      type: 'booking_confirmed',
      channels: travelerChannels,
      priority: 'high',
      subject: '',
      body: '',
      status: 'pending',
      data: {
        ...notificationData,
        userEmail: data.travelerEmail,
        deviceTokens: data.travelerDeviceTokens ?? [],
      },
    }).catch(err =>
      this.logger.error(`Failed to send booking confirmation to traveler ${data.travelerId}: ${(err as Error).message}`),
    );

    // Notify guide (new booking notification)
    await this.notificationsService.sendNotification({
      userId: data.guideId,
      type: 'new_booking',
      channels: guideChannels,
      priority: 'high',
      subject: '',
      body: '',
      status: 'pending',
      data: {
        ...notificationData,
        travelerName: data.travelerName ?? 'A traveler',
        userEmail: data.guideEmail,
        deviceTokens: data.guideDeviceTokens ?? [],
      },
    }).catch(err =>
      this.logger.error(`Failed to send new booking notification to guide ${data.guideId}: ${(err as Error).message}`),
    );
  }

  /**
   * Send booking cancellation notification to both parties.
   * Requirement 10.7
   */
  async sendBookingCancellation(data: BookingNotificationData): Promise<void> {
    const channels: NotificationChannel[] = ['email', 'in_app'];

    const notificationData = {
      bookingId: data.bookingId,
      referenceNumber: data.referenceNumber,
      experienceName: data.experienceName,
      date: data.date,
      refundAmount: data.refundAmount,
      refundCurrency: data.refundCurrency,
      cancellationReason: data.cancellationReason,
    };

    // Notify traveler
    await this.notificationsService.sendNotification({
      userId: data.travelerId,
      type: 'booking_cancelled',
      channels,
      priority: 'high',
      subject: '',
      body: '',
      status: 'pending',
      data: {
        ...notificationData,
        userEmail: data.travelerEmail,
        deviceTokens: data.travelerDeviceTokens ?? [],
      },
    }).catch(err =>
      this.logger.error(`Failed to send cancellation to traveler ${data.travelerId}: ${(err as Error).message}`),
    );

    // Notify guide
    await this.notificationsService.sendNotification({
      userId: data.guideId,
      type: 'booking_cancelled',
      channels,
      priority: 'high',
      subject: '',
      body: '',
      status: 'pending',
      data: {
        ...notificationData,
        userEmail: data.guideEmail,
        deviceTokens: data.guideDeviceTokens ?? [],
      },
    }).catch(err =>
      this.logger.error(`Failed to send cancellation to guide ${data.guideId}: ${(err as Error).message}`),
    );
  }

  /**
   * Send payment confirmation to traveler.
   * Requirement 10.3
   */
  async sendPaymentConfirmation(data: PaymentNotificationData): Promise<void> {
    await this.notificationsService.sendNotification({
      userId: data.travelerId,
      type: 'payment_received',
      channels: ['email', 'in_app'],
      priority: 'high',
      subject: '',
      body: '',
      status: 'pending',
      data: {
        paymentId: data.paymentId,
        transactionId: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        bookingId: data.bookingId,
        experienceName: data.experienceName,
        userEmail: data.travelerEmail,
        deviceTokens: data.travelerDeviceTokens ?? [],
      },
    }).catch(err =>
      this.logger.error(`Failed to send payment confirmation to traveler ${data.travelerId}: ${(err as Error).message}`),
    );
  }
}
