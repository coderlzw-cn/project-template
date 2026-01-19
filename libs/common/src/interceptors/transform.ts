import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { map, Observable } from 'rxjs';

// 定义标准响应结构
export interface ApiResponse<T> {
  data: T | null;
  code: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, ApiResponse<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const statusCode = response.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data: unknown): ApiResponse<unknown> => {
        const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
        const rawMessage = record.message;
        const message = typeof rawMessage === 'string' && rawMessage.length > 0 ? rawMessage : '请求成功';

        const normalizedData: unknown = message && Object.keys(record).length === 1 && Object.prototype.hasOwnProperty.call(record, 'message') ? null : data;

        return {
          code: statusCode,
          message,
          data: normalizedData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
