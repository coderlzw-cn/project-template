import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_BIGINT_TRANSFORM_KEY } from '../decorators/skip-bigint-transform.decorator';

export type BigIntSerializeMode = 'string' | 'number' | 'safe-number';

export interface BigIntInterceptorOptions {
  /**
   * bigint 输出策略：
   * - string：全部转字符串，默认，避免精度丢失
   * - safe-number：安全整数范围内转 number，超出范围转 string
   * - number：全部转 number，可能丢失精度
   */
  mode?: BigIntSerializeMode;
  /** 遇到循环引用时的占位值 */
  circularValue?: string;
  /** 是否将 Map/Set 转成 JSON 友好的对象/数组 */
  convertMapAndSet?: boolean;
}

const DEFAULT_BIGINT_OPTIONS: Required<BigIntInterceptorOptions> = {
  mode: 'string',
  circularValue: '[Circular]',
  convertMapAndSet: true,
};

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  private readonly options: Required<BigIntInterceptorOptions>;

  constructor(
    private readonly reflector?: Reflector,
    options: BigIntInterceptorOptions = {},
  ) {
    this.options = { ...DEFAULT_BIGINT_OPTIONS, ...options };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 全局拦截器可能作用到 WS/RPC 等上下文，这里只处理 HTTP 响应。
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector?.getAllAndOverride<boolean>(SKIP_BIGINT_TRANSFORM_KEY, [handler, controller])) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => {
        return this.serializeValue(data, new WeakSet<object>());
      }),
    );
  }

  private serializeValue(value: unknown, visiting: WeakSet<object>): unknown {
    if (typeof value === 'bigint') {
      return this.serializeBigInt(value);
    }

    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date || value instanceof StreamableFile || Buffer.isBuffer(value)) {
      return value;
    }

    if (visiting.has(value)) {
      return this.options.circularValue;
    }

    visiting.add(value);

    try {
      if (Array.isArray(value)) {
        return this.serializeArray(value, visiting);
      }

      if (this.options.convertMapAndSet && value instanceof Map) {
        return this.serializeMap(value, visiting);
      }

      if (this.options.convertMapAndSet && value instanceof Set) {
        return this.serializeSet(value, visiting);
      }

      return this.serializeObject(value as Record<string, unknown>, visiting);
    } finally {
      visiting.delete(value);
    }
  }

  private serializeBigInt(value: bigint): string | number {
    if (this.options.mode === 'number') {
      return Number(value);
    }

    if (this.options.mode === 'safe-number') {
      const numberValue = Number(value);
      return Number.isSafeInteger(numberValue) && BigInt(numberValue) === value ? numberValue : value.toString();
    }

    return value.toString();
  }

  private serializeArray(value: unknown[], visiting: WeakSet<object>): unknown[] {
    let changed = false;
    const serialized = value.map((item) => {
      const nextItem = this.serializeValue(item, visiting);
      changed ||= nextItem !== item;
      return nextItem;
    });

    return changed ? serialized : value;
  }

  private serializeMap(value: Map<unknown, unknown>, visiting: WeakSet<object>): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};

    value.forEach((mapValue, mapKey) => {
      serialized[String(mapKey)] = this.serializeValue(mapValue, visiting);
    });

    return serialized;
  }

  private serializeSet(value: Set<unknown>, visiting: WeakSet<object>): unknown[] {
    return Array.from(value, (item) => this.serializeValue(item, visiting));
  }

  private serializeObject(value: Record<string, unknown>, visiting: WeakSet<object>): Record<string, unknown> {
    let changed = false;
    const serialized: Record<string, unknown> = {};

    Object.entries(value).forEach(([key, item]) => {
      const nextItem = this.serializeValue(item, visiting);
      changed ||= nextItem !== item;
      serialized[key] = nextItem;
    });

    return changed ? serialized : value;
  }
}
