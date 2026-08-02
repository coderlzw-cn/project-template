import { PrismaService } from '@/module/prisma/prisma.service';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { type Request } from 'express';
import { authJwtConfig } from '../../../config/jwt.config';
import { IS_PUBLIC_KEY } from '../../../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 认证关闭时使用的默认用户缓存，避免每个请求都查询数据库
  private defaultUser: Express.User | null = null;

  constructor(
    private readonly reflector: Reflector,
    @Inject(authJwtConfig.KEY)
    private readonly config: ConfigType<typeof authJwtConfig>,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }
  canActivate(context: ExecutionContext) {
    // 关闭认证时，所有请求直接放行，并提供一个默认用户
    if (!this.config.enabled) {
      const request = context.switchToHttp().getRequest<Request>();
      return this.resolveDefaultUser().then((user) => {
        request.user = user;
        return true;
      });
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  /**
   * 优先使用数据库中最早创建的用户（初始化的管理员），保证 profile 等依赖真实用户记录的接口可用；
   * 数据库为空时回退到内置的模拟用户
   */
  private async resolveDefaultUser(): Promise<Express.User> {
    this.defaultUser ??= await this.prismaService.user.findFirst({ orderBy: { id: 'asc' } });

    if (this.defaultUser) return this.defaultUser;

    const date = new Date();
    return {
      id: 1,
      username: 'admin',
      role: 'ADMIN',
      password: '123456',
      email: 'admin@example.com',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdTime: date,
      updatedTime: date,
    };
  }
}
