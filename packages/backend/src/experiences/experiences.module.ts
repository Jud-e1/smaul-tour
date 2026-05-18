import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Experience } from '../database/entities/experience.entity';
import { Image } from '../database/entities/image.entity';
import { AvailabilitySlot } from '../database/entities/availability-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { ExperienceService } from './experiences.service';
import { ExperiencesController } from './experiences.controller';
import { ImageStorageService } from './image-storage.service';
import { LocationService } from './location.service';
import { VectorDatabaseModule } from '../vector/vector-database.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Experience, Image, AvailabilitySlot, Booking]),
    VectorDatabaseModule,
  ],
  providers: [ExperienceService, ImageStorageService, LocationService],
  controllers: [ExperiencesController],
  exports: [ExperienceService],
})
export class ExperiencesModule {}
