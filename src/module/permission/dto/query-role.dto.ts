import { PaginationDto } from '@/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryRoleDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按 key、名称或说明模糊搜索' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按父角色筛选', format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '按权限级别筛选', minimum: 0 })
  @Min(0)
  @IsInt()
  @IsOptional()
  level?: number;
}
