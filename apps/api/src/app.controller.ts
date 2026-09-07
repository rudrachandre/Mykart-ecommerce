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

    // 3. Execute atomic transaction deletion via raw SQL for guaranteed FK handling
    const prodArray = `ARRAY[${targetProductIds.map((id) => `'${id}'`).join(',')}]::text[]`;
    const sellArray = `ARRAY[${targetSellerIds.map((id) => `'${id}'`).join(',')}]::text[]`;
    const userArray = userIds.length > 0 ? `ARRAY[${userIds.map((id) => `'${id}'`).join(',')}]::text[]` : 'ARRAY[]::text[]';

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "CartItem" WHERE "productId" = ANY(${prodArray}) OR "variantId" IN (SELECT id FROM "ProductVariant" WHERE "productId" = ANY(${prodArray}));`);
      await tx.$executeRawUnsafe(`DELETE FROM "WishlistItem" WHERE "productId" = ANY(${prodArray});`);
      await tx.$executeRawUnsafe(`DELETE FROM "Review" WHERE "productId" = ANY(${prodArray});`);
      await tx.$executeRawUnsafe(`DELETE FROM "ProductImage" WHERE "productId" = ANY(${prodArray});`);
      await tx.$executeRawUnsafe(`DELETE FROM "OrderItem" WHERE "productId" = ANY(${prodArray}) OR "sellerId" = ANY(${sellArray}) OR "variantId" IN (SELECT id FROM "ProductVariant" WHERE "productId" = ANY(${prodArray}));`);
      await tx.$executeRawUnsafe(`DELETE FROM "Inventory" WHERE "variantId" IN (SELECT id FROM "ProductVariant" WHERE "productId" = ANY(${prodArray}));`);
      await tx.$executeRawUnsafe(`DELETE FROM "ProductVariant" WHERE "productId" = ANY(${prodArray});`);
      const deletedProductsCount = await tx.$executeRawUnsafe(`DELETE FROM "Product" WHERE id = ANY(${prodArray});`);
      const deletedSellersCount = await tx.$executeRawUnsafe(`DELETE FROM "Seller" WHERE id = ANY(${sellArray});`);
      let deletedUsersCount = 0;
      if (userIds.length > 0) {
        deletedUsersCount = await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE id = ANY(${userArray});`);
      }

      return {
        deletedProductsCount,
        deletedSellersCount,
        deletedUsersCount,
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

