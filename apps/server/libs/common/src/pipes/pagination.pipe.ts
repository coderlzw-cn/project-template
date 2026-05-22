import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

const getValidNumber = (raw: number, fallback: number) => (Number.isFinite(raw) ? raw : fallback);

/**
 * 分页管道：只应对「整段 query 对象」使用，禁止 registerGlobalPipes，
 * 否则会对 @Body()、@Param() 等每个参数执行，把入参替换成 { page, limit, offset }。
 *
 * 用法：@Get() list(@Query(PaginationPipe) q: XxxQueryDto & PaginationDto) { ... }
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'query') {
      return value;
    }
    // @Query('key') 单键绑定：value 为标量，不能做分页展开
    if (metadata.data != null) {
      return value;
    }

    const base = value !== null && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};

    const q = base as unknown as InstanceType<typeof PaginationDto>;
    const page = Math.max(1, getValidNumber(q.page, 1)); // 如果在 dto 中没有设置 page 的默认值，则使用 1
    const pageSize = Math.min(100, Math.max(1, getValidNumber(q.pageSize, 10))); // 如果在 dto 中没有设置 pageSize 的默认值，则使用 10
    const offset = q.offset ?? (page - 1) * pageSize;

    return {
      ...base,
      page,
      pageSize,
      offset,
    };
  }
}
