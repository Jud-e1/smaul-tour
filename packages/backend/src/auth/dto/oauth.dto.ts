import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class OAuthDto {
  @IsEnum(['google', 'facebook'])
  provider: 'google' | 'facebook';

  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
