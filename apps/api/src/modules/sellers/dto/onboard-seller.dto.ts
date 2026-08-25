import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OnboardSellerDto {
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;
}
