import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Changed my mind' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  reason?: string;
}
