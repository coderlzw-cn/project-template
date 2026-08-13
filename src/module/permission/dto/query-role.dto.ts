import { PaginationDto } from '@/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryRoleDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按 key、名称或说明模糊搜索' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '搜索关键词' }) })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按父角色筛选', format: 'uuid' })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID', { property: '父角色 ID' }) })
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '按权限级别筛选', minimum: 0 })
  @Transform(({ value }: { value: unknown }) => (value !== undefined && value !== null ? Number(value) : value))
  @Min(0, { message: i18nValidationMessage('validation.MIN', { property: '权限级别' }) })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT', { property: '权限级别' }) })
  @IsOptional()
  level?: number;
}
