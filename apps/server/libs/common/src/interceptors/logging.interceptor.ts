import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * HTTP 日志拦截器。
 * 作用：
 * - 记录 controller 处理耗时，而不是只记录 Express 完成时间。
 * - 输出 method、url、statusCode、ip、userAgent、requestId，便于排查慢接口和异常链路。
 * - 跳过 Swagger 和 Consul Health Check，减少噪音。
 *
 * @example
 * app.useGlobalInterceptors(new LoggingInterceptor());
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      ip?: string;
      socket?: { remoteAddress?: string };
      headers: Record<string, string | string[] | undefined>;
      requestId?: string;
    }>();
    const response = http.getResponse<{ statusCode: number }>();
    const url = request.originalUrl ?? request.url;

    if (url.startsWith('/swagger') || request.headers['user-agent']?.toString().includes('Consul Health Check')) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, response.statusCode, Date.now() - startedAt),
        error: () => this.logRequest(request, response.statusCode, Date.now() - startedAt, true),
      }),
    );
  }

  private logRequest(
    request: {
      method: string;
      originalUrl?: string;
      url: string;
      ip?: string;
      socket?: { remoteAddress?: string };
      headers: Record<string, string | string[] | undefined>;
      requestId?: string;
    },
    statusCode: number,
    durationMs: number,
    failed = false,
  ) {
    const forwardedFor = request.headers['x-forwarded-for']?.toString().split(',')[0];
    const ip = forwardedFor ?? request.ip ?? request.socket?.remoteAddress ?? '-';
    const userAgent = request.headers['user-agent'] ?? '-';
    const requestId = request.requestId ?? '-';
    const message = `requestId=${requestId} ip=${ip} method=${request.method} url=${request.originalUrl ?? request.url} status=${statusCode} duration=${durationMs}ms ua="${userAgent}"`;

    if (failed) {
      this.logger.warn(message);
      return;
    }

    this.logger.log(message);
  }
}
