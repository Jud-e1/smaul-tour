import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { VectorDatabaseModule } from './vector/vector-database.module';
import { TripPlannerModule } from './trip-planner/trip-planner.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { SecurityModule } from './security/security.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { TracingMiddleware } from './common/middleware/tracing.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 3600000, // 1 hour in milliseconds
        limit: 1000, // 1000 requests per hour for authenticated users
      },
    ]),
    ScheduleModule.forRoot(),
    MonitoringModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    ExperiencesModule,
    VectorDatabaseModule,
    TripPlannerModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    AdminModule,
    SecurityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TracingMiddleware, LoggingMiddleware).forRoutes('*');
  }
}
