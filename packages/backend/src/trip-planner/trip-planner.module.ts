import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Itinerary } from '../database/entities/itinerary.entity';
import { ItineraryExperience } from '../database/entities/itinerary-experience.entity';
import { Experience } from '../database/entities/experience.entity';
import { TripPlannerService } from './trip-planner.service';
import { TripPlannerController } from './trip-planner.controller';
import { LlmParserService } from './llm-parser.service';
import { VectorDatabaseModule } from '../vector/vector-database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Itinerary, ItineraryExperience, Experience]),
    VectorDatabaseModule,
    NotificationsModule,
  ],
  providers: [TripPlannerService, LlmParserService],
  controllers: [TripPlannerController],
  exports: [TripPlannerService],
})
export class TripPlannerModule {}
