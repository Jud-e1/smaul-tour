import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModifyItineraryDto {
  @ApiProperty({
    description: 'Natural language modification request',
    example: 'Replace the museum visit with an outdoor activity',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  modification!: string;
}
