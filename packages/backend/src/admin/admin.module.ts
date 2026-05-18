import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { Experience } from '../database/entities/experience.entity';
import { Booking } from '../database/entities/booking.entity';
import { Payment } from '../database/entities/payment.entity';
import { Review } from '../database/entities/review.entity';
import { VerificationRequest } from '../database/entities/verification-request.entity';
import { VerificationDocument } from '../database/entities/verification-document.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MetricsAggregationScheduler } from './metrics-aggregation.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Experience,
      Booking,
      Payment,
      Review,
      VerificationRequest,
      VerificationDocument,
      AuditLog,
    ]),
  ],
  providers: [AdminService, MetricsAggregationScheduler],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
