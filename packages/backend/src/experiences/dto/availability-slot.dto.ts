import { IsDateString, IsNumber, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AvailabilitySlotDto {
  @ApiProperty({ example: '2024-07-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime!: string;

  @ApiProperty({ example: '11:30' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  capacity!: number;
}
