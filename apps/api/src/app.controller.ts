import { Controller, Get, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { Role } from '@prisma/client';

const targetProductIds = [
  'e9ac86c1-8211-4ad7-ba62-29abb57fc7f0',
  '17d3dd1e-35c9-4946-8da6-54ff396b919e',
  'd9639538-1202-4009-b44f-7394e3258888',
  'b4dd8fdd-9c3b-4120-b3cf-9532385d61e3',
  '3bae6c4b-2d55-41f2-8492-aaf0c3227a50',
  'a4db3fd3-5d4d-4e73-b191-e2f9b9ea999c',
];

const targetSellerIds = [
  '4e542afd-67ff-471b-bbb9-4acdb60be088',
  '9dbd33dd-aea2-4817-96e3-62f1f0eec1fc',
  'e9d27dcd-b76f-4543-9ae3-eeddbe97729b',
  '715af4f3-feaa-4c4d-b2cb-428ca14a3c28',
  '0a34b283-d223-4f6b-ac56-54624bbaf51c',
  '7f5d6f63-e928-4905-a21c-a0e99cedf4bf',
];

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('maintenance/cleanup-qa-artifacts')
  @ApiOperation({ summary: 'Targeted Cleanup of 6 QA Test Artifacts' })
  async cleanupQaArtifacts(@Headers('x-maintenance-key') key: string) {
    if (key !== 'MyKartAdminCleanup2026') {
      throw new UnauthorizedException('Invalid maintenance key');
    }

    // 1. Restore admin@mykart.test role to ADMIN
    await this.prisma.user.updateMany({
      where: { email: 'admin@mykart.test' },
      data: { role: Role.ADMIN },
    });

    // 2. Get user IDs associated with target seller IDs
    const sellers = await this.prisma.seller.findMany({
      where: { id: { in: targetSellerIds } },
      select: { id: true, userId: true },
    });
    const userIds = sellers.map((s) => s.userId).filter(Boolean);

    // 3. Execute atomic transaction deletion
    const result = await this.prisma.$transaction(async (tx) => {
      // Get all variant IDs for target products
      const variants = await tx.productVariant.findMany({
        where: { productId: { in: targetProductIds } },
        select: { id: true },
      });
      const variantIds = variants.map((v) => v.id);

      // Delete child entries referencing target products or variants
      await tx.cartItem.deleteMany({
        where: {
          OR: [
            { productId: { in: targetProductIds } },
            { variantId: { in: variantIds } },
          ],
        },
      });

      await tx.wishlistItem.deleteMany({
        where: { productId: { in: targetProductIds } },
      });

      await tx.review.deleteMany({
        where: { productId: { in: targetProductIds } },
      });

      await tx.productImage.deleteMany({
        where: { productId: { in: targetProductIds } },
      });

      await tx.orderItem.deleteMany({
        where: {
          OR: [
            { productId: { in: targetProductIds } },
            { variantId: { in: variantIds } },
            { sellerId: { in: targetSellerIds } },
          ],
        },
      });

      if (variantIds.length > 0) {
        await tx.inventory.deleteMany({
          where: { variantId: { in: variantIds } },
        });
      }

      await tx.productVariant.deleteMany({
        where: { productId: { in: targetProductIds } },
      });

      // Delete target products
      const deletedProducts = await tx.product.deleteMany({
        where: { id: { in: targetProductIds } },
      });

      // Delete target sellers
      const deletedSellers = await tx.seller.deleteMany({
        where: { id: { in: targetSellerIds } },
      });

      // Delete target users
      const deletedUsers = await tx.user.deleteMany({
        where: { id: { in: userIds } },
      });

      return {
        deletedProductsCount: deletedProducts.count,
        deletedSellersCount: deletedSellers.count,
        deletedUsersCount: deletedUsers.count,
      };
    });

    // 4. Count remaining products
    const totalRemaining = await this.prisma.product.count();

    return {
      status: 'success',
      adminRoleRestored: true,
      result,
      totalRemainingProducts: totalRemaining,
    };
  }
}

