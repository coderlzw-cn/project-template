import { SetMetadata } from '@nestjs/common';

/** 与 TimeoutInterceptor 配合：设置路由或控制器级请求超时时间 */
export const TIMEOUT_METADATA_KEY = 'timeoutMs';

/** 与 TimeoutInterceptor 配合：跳过请求超时处理 */
export const SKIP_TIMEOUT_KEY = 'skipTimeout';

/** Node.js 定时器支持的最大延迟，约 24.8 天。 */
export const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * 设置接口超时时间，单位 ms。
 *
 * @example
 * @Timeout(30000)
 * export class ReportController {}
 *
 * @example
 * @Timeout(5000)
 * findOne() {
 *   return this.service.findOne();
 * }
 */
export const Timeout = (milliseconds: number) => {
  if (!Number.isInteger(milliseconds) || milliseconds <= 0 || milliseconds > MAX_TIMEOUT_MS) {
    throw new RangeError(`@Timeout() requires an integer between 1 and ${MAX_TIMEOUT_MS} milliseconds`);
  }

  return SetMetadata(TIMEOUT_METADATA_KEY, milliseconds);
};

/**
 * 跳过全局超时处理。适用于：
 * - SSE / 长轮询
 * - 大文件导出
 * - 路由内部自行管理超时的场景
 *
 * @example
 * @SkipTimeout()
 * exportStream() {
 *   return this.service.exportStream();
 * }
 */
export const SkipTimeout = () => SetMetadata(SKIP_TIMEOUT_KEY, true);
