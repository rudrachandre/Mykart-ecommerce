import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsOptional()
  razorpayPaymentId?: string;

  @IsString()
  @IsOptional()
  razorpayOrderId?: string;

  @IsString()
  @IsOptional()
  razorpaySignature?: string;
}
