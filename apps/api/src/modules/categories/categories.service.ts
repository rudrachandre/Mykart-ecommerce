import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateCache() {
    await this.redisService.del('categories:all:includeChildren:true');
    await this.redisService.del('categories:all:includeChildren:false');
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    await this.invalidateCache();
    return category;
  }

  async findAll(includeChildren: boolean = false) {
    const cacheKey = `categories:all:includeChildren:${includeChildren}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: {
        parentId: null, // Get top-level categories by default
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
        children: includeChildren
          ? {
              include: {
                _count: {
                  select: {
                    products: true,
                  },
                },
                children: true,
              },
            }
          : false,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Aggregate subcategory product counts into top-level parent category counts
    const result = categories.map((cat: any) => {
      const directCount = cat._count?.products || 0;
      const childrenCount =
        cat.children?.reduce(
          (sum: number, child: any) => sum + (child._count?.products || 0),
          0,
        ) || 0;

      return {
        ...cat,
        _count: {
          products: directCount + childrenCount,
        },
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
    return result;
  }

  async findOneBySlug(slug: string) {
    const cacheKey = `category:slug:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(category), 3600); // Cache for 1 hour
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });
      if (existing) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    await this.invalidateCache();
    await this.redisService.del(`category:slug:${category.slug}`);
    if (updated.slug !== category.slug) {
      await this.redisService.del(`category:slug:${updated.slug}`);
    }

    return updated;
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    // Check if it has children
    const children = await this.prisma.category.findFirst({
      where: { parentId: id },
    });

    if (children) {
      throw new ConflictException(
        'Cannot delete category that has subcategories',
      );
    }

    // Check if it has products
    const products = await this.prisma.product.findFirst({
      where: { categoryId: id },
    });

    if (products) {
      throw new ConflictException(
        'Cannot delete category that contains products',
      );
    }

    const deleted = await this.prisma.category.delete({
      where: { id },
    });

    await this.invalidateCache();
    await this.redisService.del(`category:slug:${category.slug}`);

    return deleted;
  }
}
