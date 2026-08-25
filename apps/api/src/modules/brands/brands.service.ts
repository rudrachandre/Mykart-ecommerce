import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: createBrandDto.slug },
    });

    if (existing) {
      throw new ConflictException('Brand with this slug already exists');
    }

    return this.prisma.brand.create({
      data: createBrandDto,
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOneBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with slug ${slug} not found`);
    }

    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand not found`);
    }

    if (updateBrandDto.slug && updateBrandDto.slug !== brand.slug) {
      const existing = await this.prisma.brand.findUnique({
        where: { slug: updateBrandDto.slug },
      });
      if (existing) {
        throw new ConflictException('Brand with this slug already exists');
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand not found`);
    }

    // Check if it has products
    const products = await this.prisma.product.findFirst({
      where: { brandId: id },
    });

    if (products) {
      throw new ConflictException('Cannot delete brand that contains products');
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }
}
