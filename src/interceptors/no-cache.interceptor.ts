import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { NO_CACHE_METADATA_KEY } from '../decorators/no-cache.decorator';

/**
 * 禁用缓存响应头拦截器。
 * 作用：
 * - 对标记 `@NoCache()` 的接口设置 `Cache-Control: no-store` 等响应头。
 * - 避免浏览器或代理缓存敏感响应，例如用户资料、权限、登录态。
 *
 * @example
 * @NoCache()
 * profile() {
 *   return this.userService.profile();
 * }
 */
@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const enabled = this.reflector.getAllAndOverride<boolean>(NO_CACHE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (enabled) {
      const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }

    return next.handle();
  }
}
