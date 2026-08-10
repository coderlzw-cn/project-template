import { SetMetadata } from '@nestjs/common';

export const BUSINESS_ROLES_KEY = 'business_roles';

/**
 * 声明访问接口所需的业务角色 key。
 *
 * 多个角色采用“满足任意一个即可”的策略；系统级 ADMIN 仍由 @Roles() 控制。
 */
export const BusinessRoles = (...roleKeys: string[]) => SetMetadata(BUSINESS_ROLES_KEY, roleKeys);
