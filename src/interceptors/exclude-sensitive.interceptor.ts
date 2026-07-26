import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SENSITIVE_FIELDS_METADATA_KEY, SKIP_SENSITIVE_FIELDS_METADATA_KEY } from '../decorators/sensitive.decorator';

const DEFAULT_SENSITIVE_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'privateKey', 'salt'];

/**
 * 敏感字段剔除拦截器。
 * 作用：
 * - 递归剔除响应对象里的 password、token、secret 等字段，降低误返回风险。
 * - 可用 `@SensitiveFields('idCard')` 追加业务字段。
 * - 可用 `@SkipSensitiveFields()` 跳过，避免影响特殊调试或第三方响应。
 *
 * @example
 * @SensitiveFields('idCard', 'phone')
 * findUser() {
 *   return this.userService.findUser();
 * }
 */
@Injectable()
export class ExcludeSensitiveInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    

    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector.getAllAndOverride<boolean>(SKIP_SENSITIVE_FIELDS_METADATA_KEY, [handler, controller])) {
      return next.handle();
    }

    const extraFields = this.reflector.getAllAndMerge<string[]>(SENSITIVE_FIELDS_METADATA_KEY, [controller, handler]);
    const fields = new Set([...DEFAULT_SENSITIVE_FIELDS, ...extraFields].map((field) => field.toLowerCase()));

    return next.handle().pipe(map((data) => this.strip(data, fields, new WeakSet<object>())));
  }

  private strip(value: unknown, fields: Set<string>, visiting: WeakSet<object>): unknown {
    if (value === null || value === undefined || typeof value !== 'object') {
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
        return value.map((item) => this.strip(item, fields, visiting));
      }

      const record = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};

      Object.entries(record).forEach(([key, item]) => {
        if (fields.has(key.toLowerCase())) {
          return;
        }

        output[key] = this.strip(item, fields, visiting);
      });

      return output;
    } finally {
      visiting.delete(value);
    }
  }
}
