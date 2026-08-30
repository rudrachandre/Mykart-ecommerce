import { IsString, IsNotEmpty, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReplacementItemDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'Wrong size shipped' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReplacementRequestDto {
  @ApiProperty({ example: 'Need a different size' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ type: [ReplacementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplacementItemDto)
  items: ReplacementItemDto[];
}
