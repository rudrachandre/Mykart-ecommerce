import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateInventoryDto {
  @ApiPropertyOptional({ example: 150 })
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Restock from supplier', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
