import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

export interface ItineraryNotificationData {
  itineraryId: string;
  userId: string;
  userEmail?: string;
  deviceTokens?: string[];
  experienceCount?: number;
  totalCost?: number;
  currency?: string;
}

/**
 * Service that sends notifications for itinerary generation events.
 * Requirement 10.4
 */
@Injectable()
export class ItineraryNotificationsService {
  private readonly logger = new Logger(ItineraryNotificationsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Send notification when an itinerary is generated.
   * Includes a link to view the itinerary.
   */
  async sendItineraryGenerated(data: ItineraryNotificationData): Promise<void> {
    const itineraryLink = `/itineraries/${data.itineraryId}`;

    await this.notificationsService
      .sendNotification({
        userId: data.userId,
        type: 'itinerary_generated',
        channels: ['email', 'in_app'],
        priority: 'normal',
        subject: '',
        body: '',
        status: 'pending',
        data: {
          itineraryId: data.itineraryId,
          itineraryLink,
          experienceCount: data.experienceCount,
          totalCost: data.totalCost,
          currency: data.currency,
          userEmail: data.userEmail,
          deviceTokens: data.deviceTokens ?? [],
        },
      })
      .catch((err) =>
        this.logger.error(
          `Failed to send itinerary notification to user ${data.userId}: ${(err as Error).message}`
        )
      );
  }
}
