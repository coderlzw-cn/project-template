import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ description: '当前页码', example: 1, default: 1, minimum: 1 })
  @Min(1, { message: '页码必须大于0' })
  @IsInt({ message: '页码必须为整数' })
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ description: '每页条数', example: 10, default: 10, minimum: 1, maximum: 100 })
  @Min(1, { message: '每页条数必须大于0' })
  @Max(100, { message: '每页条数必须小于等于100' })
  @IsInt({ message: '每页条数必须为整数' })
  @IsOptional()
  pageSize: number = 10;

  @ApiPropertyOptional({ description: '偏移量，不传时根据 page 和 pageSize 自动计算', example: 0, minimum: 0 })
  @Min(0, { message: '偏移量不能小于0' })
  @IsInt({ message: '偏移量必须为整数' })
  @IsOptional()
  offset?: number;
}

export interface PaginationVoValues<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  pages?: number;
}

export class PaginationVo<T> {
  constructor(values: PaginationVoValues<T>) {
    const pageSize = Math.max(values.pageSize, 1);

    this.list = values.list;
    this.total = values.total;
    this.page = values.page;
    this.pageSize = pageSize;
    this.pages = values.pages ?? Math.ceil(values.total / pageSize);
  }

  @ApiProperty({ description: '列表', type: Object, isArray: true })
  readonly list: T[];

  @ApiProperty({ description: '总数', example: 100, minimum: 0 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1, minimum: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页条数', example: 10, minimum: 1 })
  readonly pageSize: number;

  @ApiProperty({ description: '总页数', example: 10, minimum: 0 })
  readonly pages: number;
}
