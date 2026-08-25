import {
  Controller,
  Get,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(skip, take, search, role);
  }

  @Get('sellers')
  getSellers(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSellers(skip, take, search);
  }

  @Get('sellers/:id')
  getSeller(@Param('id') id: string) {
    return this.adminService.getSellerById(id);
  }

  @Get('orders')
  getOrders(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(skip, take, search, status);
  }

  @Get('products')
  getAdminProducts(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminProducts(skip, take, search);
  }

  @Patch('users/:id/role')
  changeUserRole(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.changeUserRole(admin.userId, id, dto.role);
  }

  @Patch('sellers/:id/status')
  setSellerStatus(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSellerStatusDto,
  ) {
    return this.adminService.setSellerStatus(admin.userId, id, dto.status);
  }

  @Patch('products/:id/status')
  setProductStatus(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.adminService.setProductStatus(admin.userId, id, dto.status);
  }
}
