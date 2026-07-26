import { AUDIT_LOG_METADATA_KEY, AuditLogOptions } from '@/decorators/audit-log.decorator';
import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { finalize, Observable, tap } from 'rxjs';

interface AuditRecord {
  timestamp: string;
  requestId: string;
  operatorId: string;
  action: string;
  resource: string;
  resourceId: string;
  method: string;
  path: string;
  ip: string;
  statusCode: number;
  success: boolean;
  durationMs: number;
  errorType?: string;
}

/**
 * 审计日志拦截器。
 * 仅处理显式标记 `@AuditLog()` 的 HTTP 路由，并且每次请求只写一条日志。
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<AuditLogOptions>(AUDIT_LOG_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    let requestError: unknown;

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          requestError = error;
        },
      }),
      finalize(() => {
        const record = this.buildRecord(request, response, options, startedAt, requestError);
        const message = JSON.stringify(record);

        if (record.success) {
          this.logger.log(message);
        } else {
          this.logger.warn(message);
        }
      }),
    );
  }

  private buildRecord(request: Request, response: Response, options: AuditLogOptions, startedAt: number, requestError: unknown): AuditRecord {
    const operatorIdField = options.operatorIdField ?? 'id';
    const operatorId = this.toLogValue(request.user?.[operatorIdField] ?? request.user?.sub ?? request.user?.userId);
    const resourceId = this.toLogValue(request.params?.[options.resourceIdParam ?? 'id']);
    const statusCode = requestError instanceof HttpException ? requestError.getStatus() : response.statusCode;

    return {
      timestamp: new Date().toISOString(),
      requestId: request.requestId ?? '-',
      operatorId,
      action: options.action,
      resource: options.resource,
      resourceId,
      method: request.method,
      path: request.originalUrl,
      ip: request.clientIp ?? request.ip ?? '-',
      statusCode,
      success: requestError === undefined,
      durationMs: Date.now() - startedAt,
      ...(requestError === undefined ? {} : { errorType: this.getErrorType(requestError) }),
    };
  }

  private toLogValue(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' ? String(value) : '-';
  }

  private getErrorType(error: unknown): string {
    return error instanceof Error ? error.constructor.name : 'UnknownError';
  }
}
