import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes a phone number to standard digits/E.164 format (+91XXXXXXXXXX or clean digits)
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    return `+${cleaned}`;
  }

  /**
   * Generates and sends a 6-digit OTP with strict security rules.
   */
  async sendOtp(phoneInput: string): Promise<{ success: boolean; message: string }> {
    const phone = this.normalizePhone(phoneInput);
    if (!phone || phone.length < 10) {
      throw new BadRequestException('Invalid phone number format');
    }

    // 1. Check 60-second resend cooldown
    const existing = await this.prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const timeSinceLast = Date.now() - new Date(existing.createdAt).getTime();
      if (timeSinceLast < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - timeSinceLast) / 1000);
        throw new BadRequestException(
          `Please wait ${remaining} seconds before requesting another OTP.`,
        );
      }
    }

    // 2. Invalidate all previous OTPs for this phone number
    await this.prisma.otpVerification.deleteMany({ where: { phone } });

    // 3. Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    // 4. Hash OTP before storage
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.otpVerification.create({
      data: {
        phone,
        otpHash,
        expiresAt,
        attempts: 0,
      },
    });

    // 5. Provider abstraction / Dispatch
    const isProd = process.env.NODE_ENV === 'production';
    const smsApiKey = process.env.SMS_API_KEY || process.env.TWILIO_ACCOUNT_SID;

    if (isProd) {
      if (!smsApiKey) {
        this.logger.error(
          'SMS provider credentials missing in production environment.',
        );
        throw new InternalServerErrorException(
          'SMS service is currently unavailable. Please contact support.',
        );
      }
      // Production SMS Gateway dispatch logic here
      this.logger.log(`Dispatching production SMS to ${phone}`);
    } else {
      // Non-production development logging ONLY
      this.logger.log(`[DEV OTP LOG] Verification code for ${phone}: ${rawOtp}`);
    }

    // Generic response to prevent phone enumeration
    return {
      success: true,
      message: 'If the phone number is valid, a 6-digit OTP has been sent.',
    };
  }

  /**
   * Verifies the 6-digit OTP against stored hash with attempt limits.
   */
  async verifyOtp(phoneInput: string, code: string): Promise<boolean> {
    const phone = this.normalizePhone(phoneInput);
    if (!phone || !code || code.length !== 6) {
      throw new BadRequestException('Invalid phone number or OTP format');
    }

    const record = await this.prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No OTP request found for this phone number.');
    }

    // Check expiry (5 minutes)
    if (new Date() > new Date(record.expiresAt)) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check attempt limits (max 5 attempts)
    if (record.attempts >= 5) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } });
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    // Increment attempt counter
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify hash
    const isValid = await bcrypt.compare(code, record.otpHash);
    if (!isValid) {
      throw new BadRequestException('Incorrect OTP code.');
    }

    // Invalidate OTP after successful verification
    await this.prisma.otpVerification.delete({ where: { id: record.id } });

    return true;
  }
}
