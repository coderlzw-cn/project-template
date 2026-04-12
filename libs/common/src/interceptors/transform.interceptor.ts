import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { HTTP_CODE_METADATA, REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_TRANSFORM_KEY } from '../decorations/skip-transform.decorator';

/** 统一成功响应外壳（与异常过滤器中的结构可独立演进，调用方以前端约定为准） */
export interface ApiResponse<T> {
  data: T | null;
  code: number;
  message: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 显式声明不包装（文件下载约定、特殊 JSON 等）
    if (this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [handler, controller])) {
      return next.handle();
    }

    // SSE：响应为长连接事件流，不能包一层 JSON
    if (this.reflector.get<boolean>(SSE_METADATA, handler)) {
      return next.handle();
    }

    // 重定向：框架会写 Location/status，包装会破坏语义
    if (this.reflector.get<{ statusCode?: number; url?: string } | undefined>(REDIRECT_METADATA, handler)) {
      return next.handle();
    }

    const httpCode = this.reflector.getAllAndOverride<number>(HTTP_CODE_METADATA, [handler, controller]) ?? HttpStatus.OK;

    return next.handle().pipe(map((data: unknown) => this.toEnvelope(data, httpCode)));
  }

  /**
   * 将控制器返回值转为统一外壳。
   * - `StreamableFile` / `Buffer`：文件类响应，原样返回，避免破坏流式 body。
   * - 仅 `{ message: string }`：视为「只有提示、无业务载荷」，data 置为 null（若业务实体只有一个 message 字段，请用 @SkipTransform()）。
   */
  private toEnvelope(data: unknown, httpCode: number): ApiResponse<unknown> | unknown {
    if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
      return data;
    }

    const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    const rawMessage = record.message;
    const message = typeof rawMessage === 'string' && rawMessage.length > 0 ? rawMessage : '请求成功';

    // 与历史行为一致：只要存在唯一键 `message`（含空字符串），且展示用 message 非空，则 data 置 null
    const normalizedData: unknown = message && Object.keys(record).length === 1 && Object.prototype.hasOwnProperty.call(record, 'message') ? null : data;

    return {
      code: httpCode,
      message,
      data: normalizedData,
    };
  }
}
