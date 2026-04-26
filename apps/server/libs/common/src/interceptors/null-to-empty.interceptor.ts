import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { NULL_TO_EMPTY_METADATA_KEY, NullToEmptyOptions } from '../decorators/null-to-empty.decorator';

/**
 * undefined 规范化拦截器。
 * 作用：
 * - 对标记 `@NullToEmpty()` 的接口，将 undefined 转成 null。
 * - 让前端拿到稳定 JSON 字段，避免字段有时缺失、有时为 null。
 * - 默认递归处理对象内部字段；`deep: false` 只处理顶层。
 *
 * @example
 * @NullToEmpty()
 * detail() {
 *   return { name: undefined };
 * }
 */
@Injectable()
export class NullToEmptyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<NullToEmptyOptions>(NULL_TO_EMPTY_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.normalize(data, options.deep ?? true, new WeakSet<object>())));
  }

  private normalize(value: unknown, deep: boolean, visiting: WeakSet<object>): unknown {
    if (value === undefined) {
      return null;
    }

    if (!deep || value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date || value instanceof StreamableFile || Buffer.isBuffer(value)) {
      return value;
    }

    if (visiting.has(value)) {
      return value;
    }

    visiting.add(value);

    try {
      if (Array.isArray(value)) {
        return value.map((item) => this.normalize(item, deep, visiting));
      }

      const record = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      Object.entries(record).forEach(([key, item]) => {
        output[key] = this.normalize(item, deep, visiting);
      });
      return output;
    } finally {
      visiting.delete(value);
    }
  }
}
