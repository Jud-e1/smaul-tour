import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RejectVerificationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class GetVerificationRequestsQueryDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;
}

export class RejectExperienceDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
