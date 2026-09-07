import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import type { Coupon } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findFirst({
      where: { code: { equals: normalizedCode, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code: normalizedCode,
        type: dto.type,
        value: dto.value,
        minimumOrder: dto.minimumOrder,
        maximumDiscount: dto.maximumDiscount,
        startDate: new Date(dto.startDate),
        expiryDate: new Date(dto.expiryDate),
        usageLimit: dto.usageLimit,
        active: dto.active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Single source of truth for coupon eligibility and discount calculation.
   * Used by both the public validate endpoint and checkout so the business
   * rules (activity window, minimum order, percentage/fixed, maximum cap, usage limits)
   * can never drift apart.
   */
  async resolveDiscount(
    code: string,
    orderValue: number,
  ): Promise<{ coupon: Coupon; discount: number }> {
    if (!code) throw new BadRequestException('Coupon code is required');
    const trimmed = code.trim();

    let coupon = await this.prisma.coupon.findUnique({
      where: { code: trimmed },
    });
    if (!coupon) {
      coupon = await this.prisma.coupon.findFirst({
        where: { code: { equals: trimmed, mode: 'insensitive' } },
      });
    }

    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (!coupon.active) throw new BadRequestException('Coupon is inactive');

    const now = new Date();
    if (now < coupon.startDate)
      throw new BadRequestException('Coupon is not yet valid');
    if (now > coupon.expiryDate)
      throw new BadRequestException('Coupon has expired');

    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    if (coupon.minimumOrder && orderValue < Number(coupon.minimumOrder)) {
      throw new BadRequestException(
        `Minimum order value of $${Number(coupon.minimumOrder)} required`,
      );
    }

    // Calculate discount
    let discount: number;
    if (coupon.type === 'PERCENTAGE') {
      discount = (orderValue * Number(coupon.value)) / 100;
    } else {
      discount = Number(coupon.value);
    }

    if (coupon.maximumDiscount && discount > Number(coupon.maximumDiscount)) {
      discount = Number(coupon.maximumDiscount);
    }

    return { coupon, discount };
  }

  async validateCoupon(code: string, orderValue: number) {
    const { coupon, discount } = await this.resolveDiscount(code, orderValue);

    return {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discountAmount: discount,
      finalValue: Math.max(0, orderValue - discount),
    };
  }

  async update(id: string, dto: CreateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        minimumOrder: dto.minimumOrder,
        maximumDiscount: dto.maximumDiscount,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        usageLimit: dto.usageLimit,
        active: dto.active,
      },
    });
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.delete({ where: { id } });
  }
}
