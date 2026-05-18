import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { RateLimitGuard } from './rate-limit.guard';
import { FraudDetectionService } from './fraud-detection.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, UserProfile]),
  ],
  providers: [RateLimitGuard, FraudDetectionService],
  exports: [RateLimitGuard, FraudDetectionService],
})
export class SecurityModule {}
