import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID || 'DISABLED_MISSING_GOOGLE_CLIENT_ID';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'DISABLED_MISSING_GOOGLE_CLIENT_SECRET';
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ||
      'https://mykart-ecommerce.onrender.com/api/v1/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const email = emails?.[0]?.value;
    const emailVerified = emails?.[0]?.verified !== false;

    if (!email || !emailVerified) {
      return done(
        new UnauthorizedException('Unverified or missing Google email'),
        false,
      );
    }

    try {
      const displayName =
        name && (name.givenName || name.familyName)
          ? `${name.givenName || ''} ${name.familyName || ''}`.trim()
          : profile.displayName || email.split('@')[0];

      const result = await this.authService.validateGoogleUser({
        googleId: id,
        email,
        name: displayName,
        avatar: photos?.[0]?.value,
      });

      return done(null, result);
    } catch (err) {
      return done(err as Error, false);
    }
  }
}
