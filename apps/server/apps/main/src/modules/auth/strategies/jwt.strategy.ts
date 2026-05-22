import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../config/app.config';
import { User } from '../../../generated/prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    super({
      // 从 Authorization Header 中提取 Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfiguration.publicKey, // 公钥用于校验（其他服务或 Auth 服务自身）
      // algorithms: ['RS256'],
    });
  }

  // 校验通过后，自动调用此方法
  async validate(payload: User) {
    // 返回的内容会被挂载到 request.user 上
    return { id: payload.id };
  }
}
