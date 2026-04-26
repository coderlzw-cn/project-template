import { SetMetadata } from '@nestjs/common';

/** 与 BigIntInterceptor 配合：标记后该路由响应不做 bigint 序列化处理 */
export const SKIP_BIGINT_TRANSFORM_KEY = 'skipBigIntTransform';

/**
 * 跳过 bigint 响应序列化。适用于：
 * - 路由自行接管响应写出
 * - 与第三方约定必须保留原始结构的特殊响应
 *
 * @example
 * @SkipBigIntTransform()
 * findRaw() {
 *   return rawValue;
 * }
 */
export const SkipBigIntTransform = () => SetMetadata(SKIP_BIGINT_TRANSFORM_KEY, true);
