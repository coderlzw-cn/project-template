import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';
import { HTTP_CACHE_METADATA_KEY, HttpCacheOptions } from '../decorators/cache.decorator';

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

/**
 * 轻量 HTTP 响应缓存拦截器。
 * 作用：
 * - 只缓存显式标记 `@HttpCache()` 的接口，默认不会影响所有请求。
 * - 默认按 `method + originalUrl` 作为缓存 key，适合 GET 字典、配置、公开列表。
 * - 当前为进程内缓存；多实例部署或需要主动失效时，应替换为 Redis/集中式缓存。
 *
 * @example
 * @HttpCache({ ttl: 60 })
 * findDict() {
 *   return this.service.findDict();
 * }
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<HttpCacheOptions>(HTTP_CACHE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; url: string }>();
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = options.key ?? `${request.method}:${request.originalUrl ?? request.url}`;
    const now = Date.now();
    const entry = this.cache.get(cacheKey);
    if (entry && entry.expiresAt > now) {
      return of(entry.value);
    }

    const ttl = Math.max(options.ttl ?? 60, 0);
    if (ttl === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((value) => {
        this.cache.set(cacheKey, {
          expiresAt: now + ttl * 1000,
          value,
        });
      }),
    );
  }
}
