import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from '../database/entities/notification.entity';
import { NotificationsService } from './notifications.service';
import {
  NotificationsController,
  UserNotificationPreferencesController,
} from './notifications.controller';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationQueueService, NOTIFICATION_REDIS_CLIENT } from './notification-queue.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { ItineraryNotificationsService } from './itinerary-notifications.service';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Notification])],
  providers: [
    NotificationsService,
    EmailService,
    PushService,
    NotificationTemplateService,
    NotificationQueueService,
    BookingNotificationsService,
    ItineraryNotificationsService,
    {
      provide: NOTIFICATION_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');
        try {
          return new Redis({ host, port, password, lazyConnect: true });
        } catch {
          return null;
        }
      },
    },
  ],
  controllers: [NotificationsController, UserNotificationPreferencesController],
  exports: [NotificationsService, BookingNotificationsService, ItineraryNotificationsService],
})
export class NotificationsModule {}
