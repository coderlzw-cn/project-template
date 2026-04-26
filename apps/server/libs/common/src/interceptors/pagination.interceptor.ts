import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { PAGINATION_RESPONSE_METADATA_KEY } from '../decorators/pagination-response.decorator';

/**
 * 分页响应数据。
 * @param list 列表
 * @param total 总数
 * @param page 当前页码
 * @param pageSize 每页条数
 * @param pages 总页数
 */
export interface PaginationPayload<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

/**
 * 构建分页响应数据。
 * @param list 列表
 * @param total 总数
 * @param page 当前页码
 * @param pageSize 每页条数
 * @returns 分页响应数据
 */
export function buildPaginationPayload<T = unknown>(list: T[], total: number, page: number, pageSize: number): PaginationPayload<T> {
  const normalizedPage = toPositiveNumber(page, 1);
  const normalizedPageSize = toPositiveNumber(pageSize, list.length || 10);
  const normalizedTotal = Math.max(Number(total) || 0, 0);

  return {
    list,
    total: normalizedTotal,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    pages: Math.ceil(normalizedTotal / normalizedPageSize),
  };
}

/**
 * 将值转换为正整数。
 * @param value 值
 * @param fallback 默认值
 * @returns 正整数
 */
function toPositiveNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

/**
 * 分页响应格式化拦截器。
 * 作用：
 * - 对标记 `@PaginationResponse()` 的接口统一输出 `{ list, total, page, pageSize, pages }`。
 * - 只处理服务层返回 `{ list, total, page, pageSize }` 这一种格式。
 * - 建议和 `TransformInterceptor` 搭配使用，最终会进入统一 `{ code, message, data }` 外壳。
 *
 * @example
 * @PaginationResponse()
 * async findPage() {
 *   return { list, total, page, pageSize };
 * }
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const enabled = this.reflector.getAllAndOverride<boolean>(PAGINATION_RESPONSE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!enabled) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.formatPagination(data)));
  }

  /**
   * 格式化分页响应数据。
   * @param data 响应数据
   * @returns 分页响应数据
   */
  private formatPagination(data: unknown) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const record = data as {
      list?: unknown[];
      total?: number;
      page?: number;
      pageSize?: number;
    };

    if (!Array.isArray(record.list)) {
      return data;
    }

    if (typeof record.total !== 'number' || typeof record.page !== 'number' || typeof record.pageSize !== 'number') {
      return data;
    }

    return buildPaginationPayload(record.list, record.total, record.page, record.pageSize);
  }
}
