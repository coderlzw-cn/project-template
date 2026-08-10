import { PaginationVo } from '@/dto/pagination.dto';
import { isDatabaseErrorCode, PrismaKnownErrorCode } from '@/filters/database-error';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/module/prisma/prisma.service';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { catchError, defer, forkJoin, from, map, switchMap, throwError } from 'rxjs';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { QueryRoleDto } from './dto/query-role.dto';
import type { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

const roleSelect = {
  id: true,
  key: true,
  label: true,
  description: true,
  level: true,
  parentId: true,
  createdTime: true,
  updatedTime: true,
  parent: { select: { id: true, key: true, label: true } },
  _count: { select: { children: true, userAssignments: true } },
} satisfies Prisma.RoleSelect;

@Injectable()
export class PermissionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly i18nService: I18nService,
  ) {}

  findRoles(query: QueryRoleDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = query.offset ?? (page - 1) * pageSize;
    const keyword = query.keyword?.trim();
    const where: Prisma.RoleWhereInput = {
      parentId: query.parentId,
      level: query.level,
      ...(keyword
        ? {
            OR: [{ key: { contains: keyword } }, { label: { contains: keyword } }, { description: { contains: keyword } }],
          }
        : {}),
    };

    return forkJoin({
      list: from(this.prismaService.role.findMany({ where, select: roleSelect, orderBy: [{ level: 'desc' }, { createdTime: 'asc' }], skip, take: pageSize })),
      total: from(this.prismaService.role.count({ where })),
    }).pipe(map(({ list, total }) => PaginationVo.build(list, total, page, pageSize)));
  }

  findRole(roleId: string) {
    return from(this.prismaService.role.findUnique({ where: { id: roleId }, select: roleSelect })).pipe(
      map((role) => {
        if (!role) throw new NotFoundException(this.i18nService.t('permission.ROLE_NOT_FOUND'));
        return role;
      }),
    );
  }

  createRole(dto: CreateRoleDto) {
    return defer(() =>
      from(
        this.prismaService.$transaction(async (transaction) => {
          if (dto.parentId) await this.assertParentChain(transaction, undefined, dto.parentId);
          return transaction.role.create({ data: dto, select: roleSelect });
        }),
      ),
    ).pipe(this.mapRoleKeyConflict());
  }

  updateRole(roleId: string, dto: UpdateRoleDto) {
    return defer(() =>
      from(
        this.prismaService.$transaction(async (transaction) => {
          await this.assertRoleExists(transaction, roleId);

          // 只有明确提交 parentId 时才重建父子关系；null 表示解除父角色。
          if (dto.parentId !== undefined && dto.parentId !== null) {
            await this.assertParentChain(transaction, roleId, dto.parentId);
          }
          return transaction.role.update({ where: { id: roleId }, data: dto, select: roleSelect });
        }),
      ),
    ).pipe(this.mapRoleKeyConflict());
  }

  deleteRole(roleId: string) {
    return from(
      this.prismaService.role.findUnique({
        where: { id: roleId },
        select: { id: true, _count: { select: { children: true, userAssignments: true } } },
      }),
    ).pipe(
      map((role) => {
        if (!role) throw new NotFoundException(this.i18nService.t('permission.ROLE_NOT_FOUND'));
        // 避免删除动作隐式清空授权或改变角色树，要求调用方先处理关联数据。
        if (role._count.children > 0 || role._count.userAssignments > 0) {
          throw new ConflictException(this.i18nService.t('permission.ROLE_HAS_RELATIONS'));
        }
        return role;
      }),
      switchMap(() => from(this.prismaService.role.delete({ where: { id: roleId }, select: { id: true, key: true } }))),
    );
  }

  findUserRoles(userId: number) {
    return from(
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true,
          roleAssignments: { select: { createdTime: true, role: { select: roleSelect } }, orderBy: { role: { level: 'desc' } } },
        },
      }),
    ).pipe(
      map((user) => {
        if (!user) throw new NotFoundException(this.i18nService.t('permission.USER_NOT_FOUND'));
        return { ...user, roles: user.roleAssignments.map(({ role, createdTime }) => ({ ...role, assignedTime: createdTime })), roleAssignments: undefined };
      }),
    );
  }

  replaceUserRoles(userId: number, { roleIds }: ReplaceUserRolesDto) {
    return defer(() =>
      from(
        this.prismaService.$transaction(async (transaction) => {
          await this.assertUserExists(transaction, userId);
          const existingRoleCount = await transaction.role.count({ where: { id: { in: roleIds } } });
          if (existingRoleCount !== roleIds.length) throw new NotFoundException(this.i18nService.t('permission.ROLE_NOT_FOUND'));

          // 删除和重建放在同一事务中，避免并发请求看到用户处于“部分授权”状态。
          await transaction.userRoleAssignment.deleteMany({ where: { userId } });
          if (roleIds.length > 0) {
            await transaction.userRoleAssignment.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) });
          }
          return { userId, roleIds };
        }),
      ),
    ).pipe(switchMap(() => this.findUserRoles(userId)));
  }

  grantUserRole(userId: number, roleId: string) {
    return forkJoin({
      user: from(this.prismaService.user.findUnique({ where: { id: userId }, select: { id: true } })),
      role: from(this.prismaService.role.findUnique({ where: { id: roleId }, select: { id: true } })),
    }).pipe(
      map(({ user, role }) => {
        if (!user) throw new NotFoundException(this.i18nService.t('permission.USER_NOT_FOUND'));
        if (!role) throw new NotFoundException(this.i18nService.t('permission.ROLE_NOT_FOUND'));
        return { userId: user.id, roleId: role.id };
      }),
      switchMap((data) => from(this.prismaService.userRoleAssignment.create({ data, select: { userId: true, roleId: true, createdTime: true } }))),
      catchError((error: unknown) =>
        isDatabaseErrorCode(error, PrismaKnownErrorCode.UniqueConstraintViolation)
          ? throwError(() => new ConflictException(this.i18nService.t('permission.ASSIGNMENT_EXISTS')))
          : throwError(() => error),
      ),
    );
  }

  revokeUserRole(userId: number, roleId: string) {
    return from(this.prismaService.userRoleAssignment.deleteMany({ where: { userId, roleId } })).pipe(
      map(({ count }) => {
        if (count === 0) throw new NotFoundException(this.i18nService.t('permission.ASSIGNMENT_NOT_FOUND'));
        return { userId, roleId };
      }),
    );
  }

  /**
   * 沿候选父角色持续向上查找。若遇到当前角色，说明这次修改会形成环。
   * visited 同时保护已有异常数据，避免无限循环。
   */
  private async assertParentChain(transaction: Prisma.TransactionClient, roleId: string | undefined, parentId: string) {
    const visited = new Set<string>();
    let currentId: string | null = parentId;

    while (currentId) {
      if (currentId === roleId || visited.has(currentId)) {
        throw new BadRequestException(this.i18nService.t('permission.ROLE_HIERARCHY_CYCLE'));
      }
      visited.add(currentId);
      // Prisma 7 的 TransactionClient 在当前 ESLint 类型服务中会把这里的查询结果识别为 any，
      // 实际返回值由 select 限定为 { parentId: string | null }。
      const role = await transaction.role.findUnique({ where: { id: currentId }, select: { parentId: true } });
      if (!role) throw new NotFoundException(this.i18nService.t('permission.PARENT_ROLE_NOT_FOUND'));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      currentId = role.parentId;
    }
  }

  private async assertRoleExists(transaction: Prisma.TransactionClient, roleId: string) {
    if (!(await transaction.role.findUnique({ where: { id: roleId }, select: { id: true } }))) {
      throw new NotFoundException(this.i18nService.t('permission.ROLE_NOT_FOUND'));
    }
  }

  private async assertUserExists(transaction: Prisma.TransactionClient, userId: number) {
    if (!(await transaction.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
      throw new NotFoundException(this.i18nService.t('permission.USER_NOT_FOUND'));
    }
  }

  private mapRoleKeyConflict<T>() {
    return (source: import('rxjs').Observable<T>) =>
      source.pipe(
        catchError((error: unknown) =>
          isDatabaseErrorCode(error, PrismaKnownErrorCode.UniqueConstraintViolation)
            ? throwError(() => new ConflictException(this.i18nService.t('permission.ROLE_KEY_EXISTS')))
            : throwError(() => error),
        ),
      );
  }
}
