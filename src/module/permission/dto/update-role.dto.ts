import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: '业务角色标识', example: 'custom_ops', maxLength: 64 })
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'key 只能包含小写字母、数字和下划线，且必须以字母开头' })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ description: '角色显示名称', example: '运营人员' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: '角色说明', maxLength: 1024 })
  @MaxLength(1024)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '权限级别，数值越大权限越高', minimum: 0 })
  @Min(0)
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '父角色 UUID；传 null 可提升为顶级角色', format: 'uuid', nullable: true })
  @IsUUID('4')
  @IsOptional()
  parentId?: string | null;
}
