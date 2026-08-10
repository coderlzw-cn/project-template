import { BUSINESS_ROLES_KEY } from '@/decorators/business-roles.decorator';
import { ROLES_KEY } from '@/decorators/roles.decorator';
import type { UserRole } from '@/generated/prisma/enums';
import { PrismaService } from '@/module/prisma/prisma.service';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { from, map } from 'rxjs';

/**
 * 角色守卫（全局注册，在 JwtAuthGuard 之后执行）：
 * 校验 @Roles() 声明的系统角色与 @BusinessRoles() 声明的业务角色；
 * 两者均未声明时直接放行。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
  ) {}

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const { user } = context.switchToHttp().getRequest<Request>();
    if (requiredRoles?.length && (!user || !requiredRoles.includes(user.role))) {
      throw new ForbiddenException(this.i18nService.t('auth.FORBIDDEN'));
    }

    const requiredBusinessRoles = this.reflector.getAllAndOverride<string[] | undefined>(BUSINESS_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredBusinessRoles?.length) return true;
    if (!user) throw new ForbiddenException(this.i18nService.t('auth.FORBIDDEN'));

    // 业务角色不写入 JWT，保证管理员调整授权后立即生效，无需等待令牌过期。
    return from(
      this.prismaService.userRoleAssignment.count({
        where: { userId: user.id, role: { key: { in: requiredBusinessRoles } } },
      }),
    ).pipe(
      map((count) => {
        if (count === 0) throw new ForbiddenException(this.i18nService.t('auth.FORBIDDEN'));
        return true;
      }),
    );
  }
}
