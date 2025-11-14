import { Type } from '@nestjs/common';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class PaginationVo<T> {
  constructor(values: PaginationVo<T>) {
    Object.assign(this, values);
  }
  @ApiProperty({ description: '列表', type: [Object] })
  list: T[];

  @ApiProperty({ description: '总数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;
}

export const PaginationVoSchema = <T>(type: Type<T>) => {
  return {
    type: 'object',
    properties: {
      list: { type: 'array', items: { $ref: getSchemaPath(type) } },
      total: { type: 'number' },
      page: { type: 'number' },
      pageSize: { type: 'number' },
      pages: { type: 'number' },
    },
  };
};
