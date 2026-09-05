import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AnalyticsModule } from '../analytics/analytics.module';
import { getJwtSecret } from './jwt.config';
import { MailService } from '../../common/mail/mail.service';

import { OtpService } from './otp.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: '10m', // 10 minutes short-lived
        issuer: 'mykart',
        audience: 'mykart-client',
      },
    }),
    AnalyticsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy, GoogleStrategy, MailService],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
