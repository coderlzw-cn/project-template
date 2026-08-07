import { SetMetadata } from '@nestjs/common';

export const HTTP_CACHE_METADATA_KEY = 'httpCacheOptions';

export interface HttpCacheOptions {
  /** 缓存时间，单位秒 */
  ttl?: number;
  /** 自定义缓存 key；不传时使用 method + originalUrl。最终 key 会自动追加当前响应语言。 */
  key?: string;
}

/**
 * 启用接口响应缓存。
 * 适合低频变化的 GET 查询，例如字典、配置、公开列表。
 *
 * @example
 * @HttpCache({ ttl: 60 })
 * findDict() {
 *   return this.service.findDict();
 * }
 */
export const HttpCache = (options: HttpCacheOptions = {}) => SetMetadata(HTTP_CACHE_METADATA_KEY, options);
