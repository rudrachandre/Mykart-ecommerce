import { PrismaService } from '../../src/database/prisma.service';

export async function cleanDatabase(prisma: PrismaService) {
  let retries = 3;
  while (retries > 0) {
    try {
      // Use sequential deleteMany instead of a single multi-statement raw query
      // Execute sequentially without a transaction to avoid connection exhaustion (P2028)
      await prisma.auditLog.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.coupon.deleteMany();
      await prisma.review.deleteMany();
      await prisma.return.deleteMany();
      await prisma.replacement.deleteMany();
      await prisma.refund.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.wishlistItem.deleteMany();
      await prisma.wishlist.deleteMany();
      await prisma.cartItem.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.inventory.deleteMany();
      await prisma.productImage.deleteMany();
      await prisma.productVariant.deleteMany();
      await prisma.product.deleteMany();
      await prisma.brand.deleteMany();
      await prisma.category.deleteMany();
      await prisma.seller.deleteMany();
      await prisma.address.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      return;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('Error cleaning database:', error);
        throw error;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}
