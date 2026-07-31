import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_BIGINT_TRANSFORM_KEY } from '../decorators/skip-bigint-transform.decorator';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skipped = this.reflector.getAllAndOverride<boolean>(SKIP_BIGINT_TRANSFORM_KEY, [context.getHandler(), context.getClass()]);
    if (skipped) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => {
        if (!this.containsBigInt(data, new WeakSet<object>())) {
          return data;
        }
        return this.transformBigInt(data, new WeakMap<object, unknown>());
      }),
    );
  }

  /**
   * 仅在响应包含 bigint 时复制响应对象，避免通过 JSON 序列化破坏 Date、Buffer、
   * StreamableFile、DTO 原型以及 undefined 等合法响应值。
   */
  private transformBigInt(value: unknown, visited: WeakMap<object, unknown>): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value !== 'object' || value === null || this.shouldKeepOriginal(value)) {
      return value;
    }

    const cached = visited.get(value);
    if (cached !== undefined) {
      return cached;
    }

    if (Array.isArray(value)) {
      const result: unknown[] = [];
      visited.set(value, result);
      value.forEach((item, index) => {
        result[index] = this.transformBigInt(item, visited);
      });
      return result;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result = Object.create(Reflect.getPrototypeOf(value)) as object;
    visited.set(value, result);

    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if ('value' in descriptor) {
        descriptor.value = this.transformBigInt(descriptor.value, visited);
      }
    }

    return Object.defineProperties(result, descriptors);
  }

  private containsBigInt(value: unknown, visited: WeakSet<object>): boolean {
    if (typeof value === 'bigint') {
      return true;
    }

    if (typeof value !== 'object' || value === null || this.shouldKeepOriginal(value) || visited.has(value)) {
      return false;
    }

    visited.add(value);
    const values = Array.isArray(value)
      ? value
      : Object.values(Object.getOwnPropertyDescriptors(value))
          .filter((descriptor) => descriptor.enumerable && 'value' in descriptor)
          .map((descriptor): unknown => {
            // PropertyDescriptor.value 在 TypeScript 标准库中声明为 any，
            // 先收窄为 unknown，避免把不安全类型传播到递归检查中。
            const descriptorValue: unknown = descriptor.value;
            return descriptorValue;
          });

    return values.some((item) => this.containsBigInt(item, visited));
  }

  private shouldKeepOriginal(value: object): boolean {
    if (value instanceof Date || value instanceof StreamableFile || Buffer.isBuffer(value) || ArrayBuffer.isView(value)) {
      return true;
    }

    // 原始 Node.js Stream 应交给适配器处理，不能当作普通对象复制。
    return 'pipe' in value && typeof (value as { pipe?: unknown }).pipe === 'function';
  }
}
