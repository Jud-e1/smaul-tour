import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class AdminRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
