import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Supported checkout payment methods. Online methods are fulfilled via Razorpay. */
export enum PaymentMethodDto {
  /** Pay when the order is delivered. No gateway involvement. */
  COD = 'COD',
  /** Unified Payments Interface via Razorpay Checkout. */
  UPI = 'UPI',
  /** Credit/Debit cards via Razorpay Checkout. */
  CARD = 'CARD',
  /** Net banking via Razorpay Checkout. */
  NETBANKING = 'NETBANKING',
  /** Wallets supported by the configured Razorpay account. */
  WALLET = 'WALLET',
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsString()
  addressLine2: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CheckoutDto {
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @IsString()
  @IsOptional()
  couponCode?: string;

  /** Omitted defaults to CARD-equivalent online flow for backwards compatibility. */
  @ApiPropertyOptional({ enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  @IsOptional()
  paymentMethod?: PaymentMethodDto;
}
