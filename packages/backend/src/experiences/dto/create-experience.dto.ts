import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExperienceDto {
  @ApiProperty({ example: 'Sunset Kayaking Tour', minLength: 3, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'A beautiful kayaking experience at sunset.', minLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: '123 Harbor Rd, Coastal City' })
  @IsString()
  @IsNotEmpty()
  locationAddress!: string;

  @ApiProperty({ example: 34.0522 })
  @IsNumber()
  @IsLatitude()
  @Type(() => Number)
  locationLat!: number;

  @ApiProperty({ example: -118.2437 })
  @IsNumber()
  @IsLongitude()
  @Type(() => Number)
  locationLng!: number;

  @ApiProperty({ example: 2.5, minimum: 0.5, maximum: 168 })
  @IsNumber()
  @Min(0.5)
  @Max(168)
  @Type(() => Number)
  durationHours!: number;

  @ApiProperty({ example: 75.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceAmount!: number;

  @ApiProperty({ example: 'USD', minLength: 3, maxLength: 3 })
  @IsString()
  @Length(3, 3)
  priceCurrency!: string;

  @ApiProperty({ example: ['water', 'outdoor'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  category!: string[];

  @ApiPropertyOptional({ enum: ['flexible', 'moderate', 'strict'], default: 'moderate' })
  @IsOptional()
  @IsEnum(['flexible', 'moderate', 'strict'])
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict' = 'moderate';
}
