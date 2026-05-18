import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchExperienceDto {
  @ApiPropertyOptional({ example: 'kayaking' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ type: [String], example: ['water', 'outdoor'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minDuration?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDuration?: number;

  @ApiPropertyOptional({ example: 34.0522 })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ example: -118.2437 })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  radiusKm?: number;

  @ApiPropertyOptional({ example: 4.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ enum: ['price', 'rating', 'popularity'] })
  @IsOptional()
  @IsEnum(['price', 'rating', 'popularity'])
  sortBy?: 'price' | 'rating' | 'popularity';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize: number = 20;
}
