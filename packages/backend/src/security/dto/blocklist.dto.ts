import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddToBlocklistDto {
  @IsEnum(['email', 'card'])
  type!: 'email' | 'card';

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CheckBlocklistDto {
  @IsEnum(['email', 'card'])
  type!: 'email' | 'card';

  @IsString()
  @IsNotEmpty()
  value!: string;
}
