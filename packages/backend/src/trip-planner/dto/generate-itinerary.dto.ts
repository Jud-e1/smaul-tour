import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TripParameters } from '../interfaces/trip-planner.interfaces';

export class GenerateItineraryDto {
  @ApiProperty({ description: 'Parsed trip parameters' })
  @IsObject()
  @IsNotEmpty()
  parameters!: TripParameters;
}
