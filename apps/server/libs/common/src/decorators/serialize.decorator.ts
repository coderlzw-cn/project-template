import { SetMetadata, Type } from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';

export const SERIALIZE_METADATA_KEY = 'serializeOptions';

export interface SerializeOptions<T = unknown> {
  /** 输出 DTO 类型 */
  type: Type<T>;
  /** class-transformer 配置 */
  options?: ClassTransformOptions;
}

/**
 * 使用 class-transformer 统一序列化响应。
 * 适合隐藏 password、token 等字段，或用 DTO 控制输出结构。
 *
 * @example
 * @Serialize(UserVo)
 * findOne() {
 *   return this.userService.findOne();
 * }
 */
export const Serialize = <T>(type: Type<T>, options?: ClassTransformOptions) => SetMetadata(SERIALIZE_METADATA_KEY, { type, options });
