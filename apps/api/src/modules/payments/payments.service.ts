import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import {
  signHmacSha256,
  safeSignatureEqual,
} from '../../common/utils/signature';

interface RazorpayWebhookEvent {
  event?: string;
  action?: string;
  payload?: {
    order?: { entity?: Record<string, any> };
    payment?: { entity?: Record<string, any> };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Verifies a Razorpay webhook signature using HMAC-SHA256.
   *
   * Razorpay signs the raw request body with the webhook secret. We compute the
   * expected digest ourselves and compare it in constant time with
   * `timingSafeEqual` so that signatures are never bypassed or weakened.
   */
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): boolean {
    if (!rawBody?.length || !signature || !secret) {
      return false;
    }
    const expected = signHmacSha256(secret, rawBody);
    return safeSignatureEqual(expected, signature);
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'Razorpay webhook secret is not configured',
      );
    }

    if (!this.verifyWebhookSignature(rawBody, signature, secret)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    return this.processEvent(event);
  }

  private async processEvent(event: RazorpayWebhookEvent) {
    const name = event.event ?? event.action;
    const entity =
      event.payload?.payment?.entity ?? event.payload?.order?.entity;

    if (!name) {
      return { received: true, message: 'No event name' };
    }

    switch (name) {
      case 'order.paid':
      case 'payment.captured':
      case 'payment.authorised':
        await this.confirmGatewayPayment(entity);
        break;
      case 'order.failed':
      case 'payments.failed':
      case 'payment.failed':
        await this.failGatewayPayment(entity);
        break;
      default:
        this.logger.warn(`Unhandled Razorpay webhook event: ${name}`);
        break;
    }

    return { received: true, event: name };
  }

  private async findPaymentByGatewayOrder(razorpayOrderId: string) {
    return this.prisma.payment.findFirst({
      where: { transactionId: razorpayOrderId },
      include: { order: { include: { items: true } } },
    });
  }

  private async confirmGatewayPayment(entity: Record<string, any> | undefined) {
    const gatewayOrderId =
      entity?.order_id ?? entity?.id ?? entity?.razorpay_order_id;
    if (!gatewayOrderId) {
      this.logger.warn('Webhook payment entity missing order reference');
      return;
    }

    const payment = await this.findPaymentByGatewayOrder(gatewayOrderId);
    if (!payment) {
      throw new NotFoundException('Payment record not found for webhook');
    }

    const outcome = await this.ordersService.confirmPayment(payment.id);
    this.logger.log(
      `Webhook confirmed payment ${payment.id}: ${JSON.stringify(outcome)}`,
    );
  }

  private async failGatewayPayment(entity: Record<string, any> | undefined) {
    const gatewayOrderId =
      entity?.order_id ?? entity?.id ?? entity?.razorpay_order_id;
    if (!gatewayOrderId) {
      this.logger.warn('Webhook failure entity missing order reference');
      return;
    }

    const payment = await this.findPaymentByGatewayOrder(gatewayOrderId);
    if (!payment) {
      this.logger.warn(
        `Webhook failure: no payment for gateway order ${gatewayOrderId}`,
      );
      return;
    }

    if (payment.status === 'COMPLETED') {
      return;
    }

    await this.ordersService.releaseOrderReservation(
      payment.orderId,
      payment.id,
      'FAILED',
    );
  }
}
