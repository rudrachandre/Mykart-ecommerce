import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Seller/Admin)' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @ApiOperation({
    summary: 'Get all active products with filtering and pagination',
  })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (Seller/Admin)' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Seller/Admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.productsService.remove(id, user);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload product image (Seller/Admin)' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.productsService.uploadImage(id, file, user);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product image (Seller/Admin)' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.productsService.deleteImage(id, imageId, user);
  }

  @Patch(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product image metadata (Seller/Admin)' })
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() updateImageDto: UpdateImageDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.productsService.updateImage(id, imageId, updateImageDto, user);
  }
}
