import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload } from '../auth.interfaces';
import { authJwtConfig } from '../jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authJwtConfig.KEY)
    config: ConfigType<typeof authJwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.publicKey,
      algorithms: ['RS256'],
      issuer: config.issuer,
      audience: config.audience,
    });
  }

  validate(payload: AccessTokenPayload) {
    return {
      id: payload.sub,
      username: payload.username,
    };
  }
}
