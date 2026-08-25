import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;
}
