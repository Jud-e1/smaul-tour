import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../database/entities/review.entity';
import { Booking } from '../database/entities/booking.entity';
import { Experience } from '../database/entities/experience.entity';
import { ReviewsService } from './reviews.service';
import {
  ReviewsController,
  ExperienceReviewsController,
  GuideReviewsController,
} from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, Experience])],
  providers: [ReviewsService],
  controllers: [ReviewsController, ExperienceReviewsController, GuideReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
