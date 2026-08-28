import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll(includeChildren: boolean = false) {
    return this.prisma.category.findMany({
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
                children: true,
              },
            }
          : false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOneBySlug(slug: string) {
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

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
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

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
