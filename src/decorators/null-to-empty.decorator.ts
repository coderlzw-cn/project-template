import { SetMetadata } from '@nestjs/common';

export const NULL_TO_EMPTY_METADATA_KEY = 'nullToEmptyOptions';

export interface NullToEmptyOptions {
  /** 是否递归处理对象内部字段 */
  deep?: boolean;
}

/**
 * 将响应中的 undefined 规范成 null。
 * 适合希望前端拿到稳定 JSON 字段的接口。
 *
 * @example
 * @NullToEmpty()
 * detail() {
 *   return { name: undefined };
 * }
 */
export const NullToEmpty = (options: NullToEmptyOptions = { deep: true }) => SetMetadata(NULL_TO_EMPTY_METADATA_KEY, options);
