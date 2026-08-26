import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CheckoutDto, PaymentMethodDto } from './dto/checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CouponsService } from '../coupons/coupons.service';
import { calculateShippingFee } from './shipping';
import {
  signHmacSha256,
  safeSignatureEqual,
} from '../../common/utils/signature';
import type { Coupon } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

const RESERVATION_TTL_MS = parseInt(
  process.env.INVENTORY_RESERVATION_TTL_MS || '900000',
  10,
);

@Injectable()
export class OrdersService {
  private razorpay: any | null;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private analyticsService: AnalyticsService,
    private couponsService: CouponsService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      this.razorpay = null;
    } else {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: { take: 1 } },
            },
            variant: { select: { id: true, color: true, size: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: { take: 1 } },
            },
            variant: { select: { id: true, color: true, size: true } },
          },
        },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
  async checkout(userId: string, dto: CheckoutDto) {
    const isCod = dto.paymentMethod === PaymentMethodDto.COD;

    // Only online methods touch Razorpay. Missing gateway credentials are a
    // deployment CONFIGURATION issue and fail closed with an explicit reason;
    // they never silently redirect a customer to another payment mode.
    if (!isCod && !this.razorpay) {
      throw new ServiceUnavailableException(
        'Online payments are not configured on this server (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Choose Cash on Delivery or configure the payment gateway.',
      );
    }

    // Release reservations that have expired so their stock becomes available again.
    await this.releaseExpiredReservations();

    // 1. Get user cart
    const cart: any = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: { include: { inventory: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Exact cart lines priced into this order. They are removed inside the
    // order-creation transaction below, scoped to this buyer's cart id, so a
    // rollback keeps the cart intact and other users' carts are never touched.
    const purchasedCartItemIds = (cart.items as any[]).map(
      (item) => item.id as string,
    );

    // 2. Validate inventory & calculate total
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of cart.items) {
      if (
        !item.variant.inventory ||
        item.variant.inventory.quantity < item.quantity
      ) {
        throw new BadRequestException(
          `Not enough stock for ${item.product.name}`,
        );
      }

      const price = Number(item.price);
      subtotal += price * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        sellerId: item.product.sellerId,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
    }

    let discount = 0;
    let appliedCoupon: Coupon | null = null;

    // Server-side coupon validation through the shared CouponsService rules
    // (existence, activity window, minimum order, percentage/fixed, cap).
    // The redemption itself is claimed inside the order-creation transaction below.
    if (dto.couponCode) {
      const resolved = await this.couponsService.resolveDiscount(
        dto.couponCode,
        subtotal,
      );
      discount = resolved.discount;
      appliedCoupon = resolved.coupon;
    }

    // 3. Compute fees and total.
    // Shipping is server-authoritative (see ./shipping.ts): free above the
    // threshold, otherwise a flat fee. This is the same rule documented in the
    // storefront UI; client-sent totals are never trusted.
    const shippingFee = calculateShippingFee(subtotal);
    const tax = 0;
    const total = Math.max(0, subtotal - discount + shippingFee + tax);

    const orderId = crypto.randomUUID();

    // 4. Reserve inventory (guarded so available stock can never go negative).
    //    Every reserved line uses `quantity: { gte: item.quantity }`, which is
    //    atomic at the database level and prevents overselling under concurrency.
    let reservationOk = true;
    const reservedItems: any[] = [];
    for (const item of orderItemsData) {
      const updated = await this.prisma.inventory.updateMany({
        where: {
          variantId: item.variantId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
          reserved: { increment: item.quantity },
        },
      });

      if (updated.count === 0) {
        reservationOk = false;
        break;
      }
      reservedItems.push(item);
    }

    // Roll back partial reservations if any line could not be reserved.
    if (!reservationOk) {
      for (const item of reservedItems) {
        await this.prisma.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            quantity: { increment: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }
      throw new BadRequestException(
        'Not enough stock available to complete the order',
      );
    }
    // 4. Create the gateway order for online methods only — COD never touches
    // Razorpay. On gateway failure the reservation is released before failing.
    let rpOrder: any = null;
    if (!isCod) {
      try {
        rpOrder = await this.razorpay.orders.create({
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: orderId,
          payment_capture: 1,
        });
      } catch (err: any) {
        await this.releaseReservations(reservedItems);
        // Surface the provider's own safe error fields so configuration /
        // connectivity problems are distinguishable from code failures.
        // Razorpay's `error.description` never contains key secrets.
        const detail: string =
          err?.error?.description ||
          err?.description ||
          (typeof err?.message === 'string' ? err.message.split('\n')[0] : '') ||
          'unknown gateway error';
        throw new InternalServerErrorException(
          `Online payment could not be initialized: ${detail}`.slice(0, 300),
        );
      }
    }

    // 5. Create order + payment record in one transaction.
    const order = await this.prisma.$transaction(
      async (prisma) => {
        const newOrder = await prisma.order.create({
          data: {
            id: orderId,
            userId,
            status: 'PENDING',
            subtotal,
            discount,
            shippingFee,
            tax,
            total,
            shippingAddress: dto.shippingAddress as any,
            items: {
              create: orderItemsData,
            },
          },
        });

        // Create pending payment record inside transaction. COD bypasses the
        // gateway entirely (no transaction id yet; settled on delivery).
        await prisma.payment.create({
          data: {
            orderId: orderId,
            provider: isCod ? 'COD' : 'RAZORPAY',
            amount: total,
            currency: 'INR',
            status: 'PENDING',
            transactionId: rpOrder?.id ?? null,
          },
        });

        // Claim the coupon redemption inside the SAME transaction as order +
        // payment creation. The conditional update re-evaluates `usedCount`
        // under the row lock at execution time, so parallel checkouts can
        // never push usedCount past usageLimit: the losing transaction gets
        // 0 affected rows, throws, and its order/payment roll back entirely.
        if (appliedCoupon) {
          const claimed = await prisma.coupon.updateMany({
            where:
              appliedCoupon.usageLimit == null
                ? { id: appliedCoupon.id }
                : {
                    id: appliedCoupon.id,
                    usedCount: { lt: appliedCoupon.usageLimit },
                  },
            data: { usedCount: { increment: 1 } },
          });

          if (claimed.count === 0) {
            throw new BadRequestException(
              'Coupon usage limit has been reached',
            );
          }
        }

        // Clear the purchased lines from this buyer's cart inside the same
        // transaction: if anything above fails/rolls back, the cart survives.
        // Wishlist data lives in separate tables and is never touched.
        await prisma.cartItem.deleteMany({
          where: { id: { in: purchasedCartItemIds }, cartId: cart.id },
        });

        return newOrder;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      },
    );

    return {
      order,
      paymentMethod: isCod
        ? PaymentMethodDto.COD
        : (dto.paymentMethod ?? PaymentMethodDto.CARD),
      // Gateway identifiers exist only for online payments.
      ...(rpOrder
        ? {
            razorpayOrderId: rpOrder.id,
            amount: rpOrder.amount,
            currency: rpOrder.currency,
          }
        : {}),
    };
  }

  /** Shared rollback: give stock back when a later checkout step fails. */
  private async releaseReservations(reservedItems: any[]) {
    for (const item of reservedItems) {
      await this.prisma.inventory.updateMany({
        where: { variantId: item.variantId },
        data: {
          quantity: { increment: item.quantity },
          reserved: { decrement: item.quantity },
        },
      });
    }
  }

  /**
   * Client-delivered payment verification (Razorpay Checkout flow).
   * Server-side HMAC signature check and server-side amount validation only;
   * no amount/status is ever trusted from the frontend.
   */
  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      dto;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'Payment gateway is not configured',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order has been cancelled');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, transactionId: razorpayOrderId },
    });

    if (!payment) throw new NotFoundException('Payment record not found');

    // Protect against reusing a completed/failed payment.
    if (payment.status === 'COMPLETED') {
      return { success: true };
    }
    if (payment.status === 'FAILED') {
      throw new BadRequestException('Payment has already failed');
    }

    // 1. Verify the HMAC signature (real, never bypassed).
    const expectedSignature = signHmacSha256(
      secret,
      `${razorpayOrderId}|${razorpayPaymentId}`,
    );

    if (
      !razorpaySignature ||
      !safeSignatureEqual(expectedSignature, razorpaySignature)
    ) {
      throw new BadRequestException('Invalid payment signature');
    }

    // 2. Verify the amount against the server-side order total (converted to paisa).
    const expectedAmount = Math.round(Number(order.total) * 100);
    const paymentAmount = Number(payment.amount);
    if (Math.round(paymentAmount * 100) !== expectedAmount) {
      await this.releaseOrderReservation(orderId, payment.id, 'FAILED');
      throw new BadRequestException('Payment amount mismatch');
    }

    return this.confirmPayment(payment.id);
  }
  async confirmPayment(paymentId: string) {
    let mismatchedOrderId: string | null = null;
    const result = await this.prisma.$transaction(
      async (
        prisma,
      ): Promise<{ success: boolean; already?: boolean; reason?: string }> => {
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { order: { include: { items: true } } },
        });

        if (!payment) return { success: false, reason: 'not_found' };
        if (payment.status === 'COMPLETED')
          return { success: true, already: true };
        if (payment.status === 'FAILED')
          return { success: false, reason: 'failed' };
        if (payment.order.status === 'CANCELLED') {
          return { success: false, reason: 'cancelled' };
        }

        // Never trust the client-supplied amount; always use the server order total.
        const expectedAmount = Math.round(Number(payment.order.total) * 100);
        const paidAmount = Math.round(Number(payment.amount) * 100);
        if (paidAmount !== expectedAmount) {
          mismatchedOrderId = payment.orderId;
          return { success: false, reason: 'amount_mismatch' };
        }

        // Mark payment + order.
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'COMPLETED' },
        });
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'PROCESSING' },
        });

        // Permanently release the reserved stock for orders that were paid.
        // reserved is guarded with `gte` so it never goes below zero.
        for (const item of payment.order.items) {
          const updated = await prisma.inventory.updateMany({
            where: {
              variantId: item.variantId,
              reserved: { gte: item.quantity },
            },
            data: { reserved: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            return { success: false, reason: 'reservation_missing' };
          }
        }

        return { success: true };
      },
    );

    if (!result.success) {
      if (result.reason === 'amount_mismatch' && mismatchedOrderId !== null) {
        await this.releaseOrderReservation(
          mismatchedOrderId,
          paymentId,
          'FAILED',
        );
      }
      throw new BadRequestException('Payment could not be confirmed');
    }

    if (result.already) {
      return { success: true };
    }

    const orderId = await this.getOrderIdByPaymentId(paymentId);
    if (orderId) {
      const userId = await this.getUserIdByOrderId(orderId);
      if (userId) {
        await this.notificationsService.createNotification(
          userId,
          'ORDER_UPDATE',
          'Order Confirmed',
          `Your order #${orderId} has been placed successfully.`,
        );
        await this.analyticsService.logAction(
          userId,
          'ORDER_COMPLETED',
          orderId,
          {},
        );
      }
    }

    return { success: true };
  }

  /**
   * Releases a stock reservation. Idempotent: a COMPLETED payment cannot be
   * released, and already-FAILED/CANCELLED orders are no-ops.
   */
  async releaseOrderReservation(
    orderId: string,
    paymentId: string,
    failReason: 'FAILED' | 'CANCELLED' = 'FAILED',
  ) {
    await this.prisma.$transaction(async (prisma) => {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { items: true } } },
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }
      // Idempotency: never release a completed payment.
      if (payment.status === 'COMPLETED') {
        return;
      }
      if (payment.status === failReason) {
        return;
      }

      const order = payment.order;
      if (order.status === 'CANCELLED' && failReason === 'FAILED') {
        return;
      }
      if (order.status === 'PROCESSING') {
        return;
      }

      const paymentStatus: 'FAILED' = 'FAILED';
      if (payment.status !== paymentStatus) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: paymentStatus },
        });
      }

      if (order.status !== 'CANCELLED') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        });
      }

      // Restore reserved stock back to available, never going negative.
      for (const item of order.items) {
        await prisma.inventory.updateMany({
          where: {
            variantId: item.variantId,
            reserved: { gte: item.quantity },
          },
          data: {
            reserved: { decrement: item.quantity },
            quantity: { increment: item.quantity },
          },
        });
      }
    });
  }
  /**
   * Seller-initiated cancellation of an order that has not been paid yet.
   *
   * This is deliberately a thin orchestration on top of the Module 13
   * reservation-release logic: it locates the pending payment and delegates to
   * releaseOrderReservation(), which marks the payment FAILED, cancels the
   * order and restores reserved stock atomically. There is intentionally no
   * second inventory/payment cancellation implementation.
   */
  async cancelPendingOrder(orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: 'PENDING' },
    });

    if (!payment) {
      // Paid (COMPLETED) or already-failed payments can never be released by a
      // seller; refunds are out of scope and are rejected explicitly.
      throw new BadRequestException(
        'Order cannot be cancelled in its current payment state',
      );
    }

    await this.releaseOrderReservation(orderId, payment.id, 'FAILED');

    return this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  async releaseExpiredReservations(maxAgeMs: number = RESERVATION_TTL_MS) {
    const cutoff = new Date(Date.now() - maxAgeMs);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: {
        items: true,
        payments: {
          // COD reservations must outlive the online-payment TTL: the customer
          // pays physically at delivery, not within RESERVATION_TTL_MS.
          where: { status: 'PENDING', provider: { not: 'COD' } },
          take: 1,
        },
      },
      take: 50,
    });

    let released = 0;
    for (const order of expiredOrders) {
      const pendingPayment = order.payments[0];
      if (!pendingPayment) {
        continue;
      }
      await this.releaseOrderReservation(order.id, pendingPayment.id, 'FAILED');
      released += 1;
    }

    return released;
  }

  private async getOrderIdByPaymentId(
    paymentId: string,
  ): Promise<string | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { orderId: true },
    });
    return payment?.orderId ?? null;
  }

  private async getUserIdByOrderId(orderId: string): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });
    return order?.userId ?? null;
  }
}
