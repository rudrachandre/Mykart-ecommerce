import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateProfileDto, ChangePasswordDto, CreateAddressDto, UpdateAddressDto } from './dto/user.dtos';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.getProfileData(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(@CurrentUser() user: { userId: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  async changePassword(@CurrentUser() user: { userId: string }, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  async getAddresses(@CurrentUser() user: { userId: string }) {
    return this.usersService.getAddresses(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  async createAddress(@CurrentUser() user: { userId: string }, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/addresses/:id')
  async updateAddress(
    @CurrentUser() user: { userId: string }, 
    @Param('id') id: string, 
    @Body() dto: UpdateAddressDto
  ) {
    return this.usersService.updateAddress(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/addresses/:id')
  async deleteAddress(
    @CurrentUser() user: { userId: string }, 
    @Param('id') id: string
  ) {
    return this.usersService.deleteAddress(user.userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminData() {
    return { message: 'This is highly classified admin data' };
  }
}
