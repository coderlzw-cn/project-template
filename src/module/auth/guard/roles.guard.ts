import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { ROLES_KEY } from '@/decorators/roles.decorator';
import type { UserRole } from '@/generated/prisma/enums';
import { type Request } from 'express';

/**
 * 角色守卫（全局注册，在 JwtAuthGuard 之后执行）：
 * 校验 @Roles() 声明的角色要求，未声明角色的接口直接放行
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService,
  ) {}

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(this.i18nService.t('auth.FORBIDDEN'));
    }
    return true;
  }
}
