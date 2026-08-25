import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPED })
  status: OrderStatus;
}