import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkUpdateItemDto {
  @ApiProperty({ example: 'variant-id-1' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  quantity: number;
}

export class BulkUpdateInventoryDto {
  @ApiProperty({ type: [BulkUpdateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}
