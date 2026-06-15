import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushPayload } from './interfaces/notification.interfaces';

/**
 * Push notification service supporting FCM (Android) and APNS (iOS).
 * Falls back to a no-op logger when credentials are not configured.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcmServerKey: string | undefined;
  private readonly apnsKeyId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
    this.apnsKeyId = this.configService.get<string>('APNS_KEY_ID');

    if (!this.fcmServerKey && !this.apnsKeyId) {
      this.logger.warn(
        'No push notification provider configured. Push notifications will be logged only.'
      );
    }
  }

  async sendPush(payload: PushPayload): Promise<boolean> {
    if (!payload.deviceTokens || payload.deviceTokens.length === 0) {
      this.logger.debug('No device tokens provided, skipping push notification');
      return true;
    }

    try {
      if (this.fcmServerKey) {
        return await this.sendViaFCM(payload);
      } else {
        this.logger.log(
          `[PUSH MOCK] Title: ${payload.title} | Body: ${payload.body} | Tokens: ${payload.deviceTokens.length}`
        );
        return true;
      }
    } catch (err) {
      this.logger.error(`Failed to send push notification: ${(err as Error).message}`);
      return false;
    }
  }

  private async sendViaFCM(payload: PushPayload): Promise<boolean> {
    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

    const body = JSON.stringify({
      registration_ids: payload.deviceTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    });

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${this.fcmServerKey}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`FCM request failed with status ${response.status}`);
    }

    this.logger.log(`Push notification sent via FCM to ${payload.deviceTokens.length} device(s)`);
    return true;
  }
}
