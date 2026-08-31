import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateCache() {
    await this.redisService.del('brands:all');
  }

  async create(createBrandDto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: createBrandDto.slug },
    });

    if (existing) {
      throw new ConflictException('Brand with this slug already exists');
    }

    const brand = await this.prisma.brand.create({
      data: createBrandDto,
    });

    await this.invalidateCache();
    return brand;
  }

  async findAll() {
    const cacheKey = 'brands:all';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const brands = await this.prisma.brand.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    await this.redisService.set(cacheKey, JSON.stringify(brands), 3600); // Cache for 1 hour
    return brands;
  }

  async findOneBySlug(slug: string) {
    const cacheKey = `brand:slug:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const brand = await this.prisma.brand.findUnique({
      where: { slug },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with slug ${slug} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(brand), 3600); // Cache for 1 hour
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

    const updated = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });

    await this.invalidateCache();
    await this.redisService.del(`brand:slug:${brand.slug}`);
    if (updated.slug !== brand.slug) {
      await this.redisService.del(`brand:slug:${updated.slug}`);
    }

    return updated;
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

    const deleted = await this.prisma.brand.delete({
      where: { id },
    });

    await this.invalidateCache();
    await this.redisService.del(`brand:slug:${brand.slug}`);

    return deleted;
  }
}
