import { IsString, IsOptional } from 'class-validator';

export class UpdateSellerDto {
  @IsString()
  @IsOptional()
  storeName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;
}
