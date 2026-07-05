import { SetMetadata } from '@nestjs/common';

/** 与 TimeoutInterceptor 配合：设置路由或控制器级请求超时时间 */
export const TIMEOUT_METADATA_KEY = 'timeoutMs';

/** 与 TimeoutInterceptor 配合：跳过请求超时处理 */
export const SKIP_TIMEOUT_KEY = 'skipTimeout';

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
export const Timeout = (milliseconds: number) => SetMetadata(TIMEOUT_METADATA_KEY, milliseconds);

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
