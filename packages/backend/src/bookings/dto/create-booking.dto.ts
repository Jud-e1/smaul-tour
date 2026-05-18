import { IsString, IsDateString, IsInt, IsOptional, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Experience ID to book' })
  @IsString()
  experienceId: string;

  @ApiProperty({ description: 'Date of the experience (YYYY-MM-DD)', example: '2026-04-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Start time of the slot (HH:MM)', example: '09:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime: string;

  @ApiProperty({ description: 'Number of participants', minimum: 1 })
  @IsInt()
  @Min(1)
  participants: number;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate bookings' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
