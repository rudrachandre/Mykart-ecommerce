import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateImageDto {
  @ApiPropertyOptional({ example: 'Product front view' })
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
