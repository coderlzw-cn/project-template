import { SetMetadata } from '@nestjs/common';

/** 与 TransformInterceptor 配合：标记后该路由响应不做 { code, message, data } 包装 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * 跳过全局响应包装。适用于：
 * - 仅含 `message` 字段的业务对象若会被误判为「无 data」，可改用本装饰器原样返回
 * - 与第三方约定的特殊 JSON 结构
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
