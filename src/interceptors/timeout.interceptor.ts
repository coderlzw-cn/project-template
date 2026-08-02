import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, timeout } from 'rxjs';
import { MAX_TIMEOUT_MS, SKIP_TIMEOUT_KEY, TIMEOUT_METADATA_KEY } from '../decorators/timeout.decorator';

const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();
    const skipped = this.reflector.getAllAndOverride<boolean>(SKIP_TIMEOUT_KEY, [handler, controller]);
    const isSse = this.reflector.get<boolean>(SSE_METADATA, handler);
    if (skipped || isSse) {
      return next.handle();
    }

    const configuredTimeout = this.reflector.getAllAndOverride<number>(TIMEOUT_METADATA_KEY, [handler, controller]);
    const timeoutMs = Number.isInteger(configuredTimeout) && (configuredTimeout ?? 0) > 0 && (configuredTimeout ?? 0) <= MAX_TIMEOUT_MS ? configuredTimeout : DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout({
        // HTTP 请求只关心首次响应；SSE 已在上方跳过，不应对后续发射间隔重复计时。
        first: timeoutMs,
        with: () => {
          return throwError(() => new RequestTimeoutException(`请求处理超过 ${timeoutMs}ms`));
        },
      }),
    );
  }
}
