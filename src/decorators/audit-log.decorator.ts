import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_METADATA_KEY = 'auditLogOptions';

export interface AuditLogOptions {
  /** 操作名称，例如 CREATE_USER、DELETE_ORDER。 */
  action: string;
  /** 被操作的资源类型，例如 user、order。 */
  resource: string;
  /** 从路由参数中读取资源 ID 的字段名，默认 id。 */
  resourceIdParam?: string;
  /** 从 request.user 中读取操作人 ID 的字段名，默认 id。 */
  operatorIdField?: string;
}

/**
 * 为需要追踪的写操作记录审计日志。
 * 不记录请求体和响应体，避免密码、Token 等敏感信息进入日志。
 *
 * @example
 * @AuditLog({ action: 'DELETE_USER', resource: 'user' })
 * @Delete(':id')
 * remove() {}
 */
export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_METADATA_KEY, options);
