import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => this.serialize(data)));
  }

  private serialize(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map((item) => this.serialize(item));
    if (typeof obj === 'object') {
      return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, this.serialize(value)]));
    }
    return obj;
  }
}
