import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseTripRequestDto {
  @ApiProperty({ description: 'Natural language trip description', example: 'I want a 3-day food and culture trip in Tokyo with a budget of $500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  naturalLanguageInput!: string;
}
