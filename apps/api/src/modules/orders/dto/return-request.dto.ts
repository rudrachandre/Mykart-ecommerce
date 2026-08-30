import { IsString, IsNotEmpty, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnItemDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'Product arrived damaged' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReturnRequestDto {
  @ApiProperty({ example: 'Product did not match description' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
