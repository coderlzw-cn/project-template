import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_FIELDS_METADATA_KEY = 'sensitiveFields';
export const SKIP_SENSITIVE_FIELDS_METADATA_KEY = 'skipSensitiveFields';

/**
 * 追加需要从响应中剔除的敏感字段。
 * 默认字段包括 password、token、refreshToken、secret、privateKey 等。
 *
 * @example
 * @SensitiveFields('idCard', 'phone')
 * findUser() {
 *   return this.userService.findUser();
 * }
 */
export const SensitiveFields = (...fields: string[]) => SetMetadata(SENSITIVE_FIELDS_METADATA_KEY, fields);

/**
 * 跳过敏感字段剔除。
 * 适合内部调试接口或已经自行处理过输出的路由。
 *
 * @example
 * @SkipSensitiveFields()
 * debug() {
 *   return this.service.debug();
 * }
 */
export const SkipSensitiveFields = () => SetMetadata(SKIP_SENSITIVE_FIELDS_METADATA_KEY, true);
