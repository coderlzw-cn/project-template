import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: '业务角色标识', example: 'custom_ops', maxLength: 64 })
  @MaxLength(64, { message: i18nValidationMessage('validation.MAX_LENGTH', { property: '业务角色标识' }) })
  @Matches(/^[a-z][a-z0-9_]*$/, { message: i18nValidationMessage('validation.MATCHES', { property: '业务角色标识' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '业务角色标识' }) })
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ description: '角色显示名称', example: '运营人员' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '角色显示名称' }) })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: '角色说明', maxLength: 1024 })
  @MaxLength(1024, { message: i18nValidationMessage('validation.MAX_LENGTH', { property: '角色说明' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '角色说明' }) })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '权限级别，数值越大权限越高', minimum: 0 })
  @Min(0, { message: i18nValidationMessage('validation.MIN', { property: '权限级别' }) })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT', { property: '权限级别' }) })
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '父角色 UUID；传 null 可提升为顶级角色', format: 'uuid', nullable: true })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID', { property: '父角色 ID' }) })
  @IsOptional()
  parentId?: string | null;
}
