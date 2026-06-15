import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { OAuthUser } from '../interfaces/auth.interfaces';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.facebook.appId'),
      clientSecret: configService.get<string>('oauth.facebook.appSecret'),
      callbackURL: '/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'picture'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void
  ): void {
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;
    const photo = (profile.photos as any)?.[0]?.value;

    const oauthUser: OAuthUser = {
      provider: 'facebook',
      providerId: profile.id,
      email: email ?? `${profile.id}@facebook.placeholder`,
      firstName: firstName ?? 'User',
      lastName: lastName ?? '',
      photo,
    };

    done(null, oauthUser);
  }
}
