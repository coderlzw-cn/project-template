import { PaginationDto } from '@/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryRoleDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按 key、名称或说明模糊搜索' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按父角色筛选', format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '按权限级别筛选', minimum: 0 })
  @Transform(({ value }: { value: unknown }) => (value !== undefined && value !== null ? Number(value) : value))
  @Min(0)
  @IsInt()
  @IsOptional()
  level?: number;
}
