import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({ example: 50 })
  @IsInt()
  quantity: number;

  @ApiProperty({ example: 'Restock from supplier', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
