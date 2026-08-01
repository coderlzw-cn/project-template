import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@/generated/prisma/enums';

export const ROLES_KEY = 'roles';
/** 声明接口允许的角色，未声明的接口不做角色限制 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
