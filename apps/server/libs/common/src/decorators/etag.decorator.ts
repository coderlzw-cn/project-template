import { SetMetadata } from '@nestjs/common';

export const ETAG_METADATA_KEY = 'etagEnabled';

/**
 * 为 GET 响应生成 ETag。
 * 当客户端携带匹配的 If-None-Match 时，接口会返回 304，减少重复传输。
 *
 * @example
 * @ETag()
 * findConfig() {
 *   return this.service.findConfig();
 * }
 */
export const ETag = () => SetMetadata(ETAG_METADATA_KEY, true);
