import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * 请求链路 ID 拦截器。
 * 作用：
 * - 复用客户端传入的 `x-request-id`，没有则生成 UUID。
 * - 将 requestId 写入请求对象，供日志、异常过滤器、业务代码读取。
 * - 将 requestId 写入响应头，方便前端和日志系统关联一次请求。
 *
 * @example
 * app.useGlobalInterceptors(new TraceIdInterceptor());
 */
@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; requestId?: string }>();
    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();
    const incomingRequestId = request.headers[REQUEST_ID_HEADER];
    const requestId = request.requestId ?? (typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0 ? incomingRequestId : randomUUID());

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }
}
