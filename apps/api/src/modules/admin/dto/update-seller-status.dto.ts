import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

/**
 * Seller.status is intentionally a plain string column in the schema
 * (default "ACTIVE"). Moderation is restricted to these two values.
 */
export const SELLER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export class UpdateSellerStatusDto {
  @IsIn(SELLER_STATUSES)
  @IsNotEmpty()
  @ApiProperty({ enum: SELLER_STATUSES })
  status: (typeof SELLER_STATUSES)[number];
}
