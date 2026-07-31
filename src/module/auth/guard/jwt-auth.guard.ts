import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../decorators/public.decorator';
import type { ConfigType } from '@nestjs/config';
import { authJwtConfig } from '../jwt.config';
import { type Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject(authJwtConfig.KEY)
    private readonly config: ConfigType<typeof authJwtConfig>,
  ) {
    super();
  }
  canActivate(context: ExecutionContext) {
    // 关闭认证时，所有请求直接放行，并提供一个默认用户
    if (!this.config.enabled) {
      const request = context.switchToHttp().getRequest<Request>();
      const date = new Date();
      request.user = {
        id: 1,
        username: 'admin',
        password: '123456',
        email: 'admin@example.com',
        createdAt: date,
        updatedAt: date,
      };
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
