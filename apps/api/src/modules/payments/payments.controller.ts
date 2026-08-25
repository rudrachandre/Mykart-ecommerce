import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common/interfaces';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Razorpay webhook endpoint.
   *
   * The raw (unparsed) request body is required so the HMAC-SHA256 signature can
   * be verified exactly as Razorpay signed it. The global JSON body parser is
   * bypassed for this route; the body buffer is exposed via `req.rawBody`.
   */
  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw request body');
    }
    return this.paymentsService.handleWebhook(req.rawBody, signature ?? '');
  }
}
