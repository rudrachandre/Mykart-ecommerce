import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { BulkUpdateInventoryDto } from './dto/bulk-update-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('variant/:variantId')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory by variant ID' })
  getInventoryByVariantId(
    @CurrentUser() user: { userId: string },
    @Param('variantId') variantId: string,
  ) {
    return this.inventoryService.getInventoryByVariantId(variantId, user);
  }

  @Patch('variant/:variantId')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inventory quantity' })
  updateStock(
    @CurrentUser() user: { userId: string },
    @Param('variantId') variantId: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateStock(
      variantId,
      user,
      updateInventoryDto.quantity ?? 0,
      updateInventoryDto.reason,
    );
  }

  @Get('low-stock')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStock(
    @CurrentUser() user: { userId: string },
    @Query('threshold') threshold?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold, 10) : 10;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.inventoryService.getLowStockItems(
      user,
      thresholdNum,
      pageNum,
      limitNum,
      sellerId,
    );
  }

  @Post('bulk-update')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update inventory quantities' })
  bulkUpdateStock(
    @CurrentUser() user: { userId: string },
    @Body() bulkUpdateInventoryDto: BulkUpdateInventoryDto,
  ) {
    return this.inventoryService.bulkUpdateStock(
      bulkUpdateInventoryDto.updates,
      user,
    );
  }
}
