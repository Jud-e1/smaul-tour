import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Booking } from '../database/entities/booking.entity';
import { AvailabilitySlot } from '../database/entities/availability-slot.entity';
import { Experience } from '../database/entities/experience.entity';
import { Payment } from '../database/entities/payment.entity';
import { BookingsService, REDIS_CLIENT } from './bookings.service';
import { BookingsController, UserBookingsController, GuideBookingsController } from './bookings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Booking, AvailabilitySlot, Experience, Payment]),
    NotificationsModule,
  ],
  providers: [
    BookingsService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');
        return new Redis({ host, port, password, lazyConnect: true });
      },
    },
  ],
  controllers: [BookingsController, UserBookingsController, GuideBookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
