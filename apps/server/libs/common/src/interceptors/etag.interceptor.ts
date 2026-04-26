import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { map, Observable } from 'rxjs';
import { ETAG_METADATA_KEY } from '../decorators/etag.decorator';

/**
 * ETag 拦截器。
 * 作用：
 * - 对标记 `@ETag()` 的 GET 接口基于响应体生成弱 ETag。
 * - 如果请求头 `If-None-Match` 匹配，返回 304，避免重复传输相同内容。
 * - 适合配置、字典、低频变化的只读接口。
 *
 * @example
 * @ETag()
 * findConfig() {
 *   return this.configService.findPublicConfig();
 * }
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const enabled = this.reflector.getAllAndOverride<boolean>(ETAG_METADATA_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<{ method: string; headers: Record<string, string | string[] | undefined> }>();
    if (!enabled || request.method !== 'GET') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{
      status: (statusCode: number) => unknown;
      setHeader: (name: string, value: string) => void;
    }>();

    return next.handle().pipe(
      map((data) => {
        const etag = this.createEtag(data);
        response.setHeader('ETag', etag);
        response.setHeader('Cache-Control', 'private, must-revalidate');

        if (request.headers['if-none-match'] === etag) {
          response.status(HttpStatus.NOT_MODIFIED);
          return undefined;
        }

        return data;
      }),
    );
  }

  private createEtag(data: unknown): string {
    const payload = JSON.stringify(data);
    const hash = createHash('sha1').update(payload).digest('base64url');
    return `W/"${hash}"`;
  }
}
