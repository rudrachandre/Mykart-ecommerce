import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundProcessDto {
  @ApiProperty({ example: 499.99 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Item returned in damaged condition' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
