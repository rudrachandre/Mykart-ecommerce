import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal transactional email service. Uses the Resend HTTP API directly
 * (no SDK dependency). Never throws to the caller — delivery problems are
 * logged, never surfaced to clients, and never include tokens or secrets.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || 'MyKart <onboarding@resend.dev>';
    const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const resetUrl = `${webAppUrl}/reset-password?token=${resetToken}`;

    if (!apiKey) {
      // No provider configured (local development). The raw link is only ever
      // logged outside production so developers can complete the flow.
      this.logger.log(
        `Password reset email skipped for ${to} (RESEND_API_KEY not configured)`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[DEV ONLY] password reset link: ${resetUrl}`);
      }
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: 'Reset your MyKart password',
          html: `<p>We received a request to reset your MyKart password.</p>
<p><a href="${resetUrl}">Reset your password</a></p>
<p>This link expires in 15 minutes. If you did not request a reset, you can safely ignore this email.</p>`,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Resend delivery failed with status ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error('Resend delivery failed', error);
    }
  }

  async sendNotificationEmail(to: string, subject: string, message: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || 'MyKart <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.log(
        `Notification email skipped for ${to} (RESEND_API_KEY not configured): Subject: ${subject}`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[DEV ONLY] Message: ${message}`);
      }
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html: `<p>${message}</p>`,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Resend delivery failed with status ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error('Resend delivery failed', error);
    }
  }
}
