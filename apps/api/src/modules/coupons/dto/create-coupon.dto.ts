import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumOrder?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maximumDiscount?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  expiryDate: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
