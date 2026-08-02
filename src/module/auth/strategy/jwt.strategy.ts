import { PrismaService } from '@/module/prisma/prisma.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { authJwtConfig } from '../../../config/jwt.config';
import type { AuthTokenClaims } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authJwtConfig.KEY)
    config: ConfigType<typeof authJwtConfig>,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      // 从 Authorization: Bearer <token> 请求头中提取 JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 拒绝已过期的令牌
      ignoreExpiration: false,
      // 使用 RSA 公钥验证令牌签名
      secretOrKey: config.publicKey,
      // 仅允许 RS256，避免接受非预期的签名算法
      algorithms: ['RS256'],
      // 校验令牌签发方
      issuer: config.issuer,
      // 校验令牌的目标受众
      audience: config.audience,
    });
  }

  async validate(payload: AuthTokenClaims): Promise<AuthUserPayload> {
    if (!Number.isInteger(payload.id) || !payload.username || !payload.role || !payload.jti) {
      throw new UnauthorizedException(this.i18nService.t('auth.INVALID_ACCESS_TOKEN', { lang: I18nContext.current()?.lang }));
    }

    const session = await this.prismaService.authSession.findFirst({
      where: {
        id: payload.jti,
        userId: payload.id,
        revokedTime: null,
        expiresTime: { gt: new Date() },
      },
      select: { id: true, user: { select: { role: true } } },
    });
    if (!session || session.user.role !== payload.role) {
      throw new UnauthorizedException(this.i18nService.t('auth.INVALID_ACCESS_TOKEN', { lang: I18nContext.current()?.lang }));
    }

    return {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      sessionId: session.id,
    };
  }
}
