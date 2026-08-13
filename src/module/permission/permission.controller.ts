import { Public } from '@/decorators/public.decorator';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionService } from './permission.service';

@ApiBearerAuth()
@Public()
@ApiTags('权限管理')
// @Roles('ADMIN')
@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('roles')
  @ApiOperation({ summary: '分页查询业务角色' })
  findRoles(@Query() query: QueryRoleDto) {
    return this.permissionService.findRoles(query);
  }

  @Get('roles/:roleId')
  @ApiOperation({ summary: '查询角色详情' })
  findRole(@Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string) {
    return this.permissionService.findRole(roleId);
  }

  @Post('roles')
  @ApiOperation({ summary: '创建业务角色' })
  createRole(@Body() body: CreateRoleDto) {
    return this.permissionService.createRole(body);
  }

  @Patch('roles/:roleId')
  @ApiOperation({ summary: '更新业务角色' })
  updateRole(@Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string, @Body() body: UpdateRoleDto) {
    return this.permissionService.updateRole(roleId, body);
  }

  @Delete('roles/:roleId')
  @ApiOperation({ summary: '删除无子角色且未分配用户的角色' })
  deleteRole(@Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string) {
    return this.permissionService.deleteRole(roleId);
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: '查询用户的业务角色' })
  findUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.permissionService.findUserRoles(userId);
  }

  @Put('users/:userId/roles')
  @ApiOperation({ summary: '原子替换用户的全部业务角色' })
  replaceUserRoles(@Param('userId', ParseIntPipe) userId: number, @Body() body: ReplaceUserRolesDto) {
    return this.permissionService.replaceUserRoles(userId, body);
  }

  @Post('users/:userId/roles/:roleId')
  @ApiOperation({ summary: '向用户授予一个业务角色' })
  grantUserRole(@Param('userId', ParseIntPipe) userId: number, @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string) {
    return this.permissionService.grantUserRole(userId, roleId);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤销用户的一个业务角色' })
  revokeUserRole(@Param('userId', ParseIntPipe) userId: number, @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string) {
    return this.permissionService.revokeUserRole(userId, roleId);
  }
}
