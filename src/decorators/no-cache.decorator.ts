import { SetMetadata } from '@nestjs/common';

export const NO_CACHE_METADATA_KEY = 'noCacheEnabled';

/**
 * 禁用客户端和代理缓存。
 * 适合登录态、权限、个人信息、临时签名 URL 等敏感接口。
 *
 * @example
 * @NoCache()
 * profile() {
 *   return this.userService.profile();
 * }
 */
export const NoCache = () => SetMetadata(NO_CACHE_METADATA_KEY, true);
