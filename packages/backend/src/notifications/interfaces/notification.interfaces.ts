export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'itinerary_generated'
  | 'review_received'
  | 'verification_approved'
  | 'new_booking';

export type NotificationChannel = 'email' | 'push' | 'in_app';

export type NotificationPriority = 'high' | 'normal' | 'low';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  subject: string;
  body: string;
  data: Record<string, any>;
  status: NotificationStatus;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

export interface INotificationPreferences {
  userId: string;
  email: {
    bookingConfirmed: boolean;
    bookingCancelled: boolean;
    paymentReceived: boolean;
    itineraryGenerated: boolean;
    reviewReceived: boolean;
  };
  push: {
    bookingConfirmed: boolean;
    bookingCancelled: boolean;
    paymentReceived: boolean;
    newBooking: boolean;
  };
  inApp: {
    all: boolean;
  };
}

export interface INotificationService {
  sendNotification(
    notification: Omit<INotification, 'id' | 'createdAt'>,
  ): Promise<INotification>;
  getUserNotifications(
    userId: string,
    filters?: { unreadOnly?: boolean },
  ): Promise<INotification[]>;
  markAsRead(notificationId: string): Promise<void>;
  updatePreferences(
    userId: string,
    preferences: Partial<INotificationPreferences>,
  ): Promise<INotificationPreferences>;
  getPreferences(userId: string): Promise<INotificationPreferences>;
}

/** Token for DI injection */
export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';

/** Notification template context */
export interface NotificationTemplateContext {
  type: NotificationType;
  data: Record<string, any>;
}

/** Rendered notification content */
export interface RenderedNotification {
  subject: string;
  body: string;
  htmlBody?: string;
}

/** Email send options */
export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Push notification payload */
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  deviceTokens: string[];
}
