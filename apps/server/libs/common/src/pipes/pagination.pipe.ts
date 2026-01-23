import { Injectable, PipeTransform } from '@nestjs/common';

export interface PaginationDto {
  page: number;
  limit: number;
  offset: number;
}

interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

/**
 * 分页管道
 * 默认分页大小为 10，最大分页大小为 100
 * @param value 分页查询参数
 * @returns 分页数据
 * @example
 * @PaginationPipe()
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: PaginationQuery): PaginationDto {
    const page = Math.max(1, parseInt(String(value?.page || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(value?.limit || 10))));
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
    };
  }
}
