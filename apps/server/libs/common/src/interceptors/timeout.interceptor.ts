import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SKIP_TIMEOUT_KEY, TIMEOUT_METADATA_KEY } from '../decorators/timeout.decorator';

export interface TimeoutInterceptorOptions {
  /** 默认超时时间，单位 ms */
  defaultTimeoutMs?: number;
  /** 超时后抛出的错误信息 */
  timeoutMessage?: string;
}

const DEFAULT_TIMEOUT_OPTIONS: Required<TimeoutInterceptorOptions> = {
  defaultTimeoutMs: 10000,
  timeoutMessage: '请求超时',
};

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly options: Required<TimeoutInterceptorOptions>;

  constructor(
    private readonly reflector?: Reflector,
    options: TimeoutInterceptorOptions = {},
  ) {
    this.options = { ...DEFAULT_TIMEOUT_OPTIONS, ...options };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 全局拦截器可能作用到 WS/RPC 等上下文，这里只处理 HTTP 请求。
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector?.getAllAndOverride<boolean>(SKIP_TIMEOUT_KEY, [handler, controller])) {
      return next.handle();
    }

    const timeoutMs = this.reflector?.getAllAndOverride<number>(TIMEOUT_METADATA_KEY, [handler, controller]) ?? this.options.defaultTimeoutMs;

    if (timeoutMs <= 0) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException(this.options.timeoutMessage));
        }

        return throwError(() => err);
      }),
    );
  }
}
