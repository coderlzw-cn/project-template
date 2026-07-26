import { SKIP_TRANSFORM_KEY } from '@/decorators/skip-transform.decorator';
import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { HTTP_CODE_METADATA, REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { translate } from '@/i18n/i18n';

export interface ApiResponse<T> {
  data: T | null;
  code: number;
  message: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

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
    const locale = context.switchToHttp().getRequest<Request>().locale;

    return next.handle().pipe(map((data: unknown) => this.toEnvelope(data, httpCode, locale)));
  }

  /**
   * 将控制器返回值转为统一外壳。
   * - `StreamableFile` / `Buffer`：文件类响应，原样返回，避免破坏流式 body。
   * - `{ message: string }`：作为操作提示，data 置为 null。
   * - `{ message: string, data: unknown }`：提取自定义提示和业务数据，避免重复嵌套。
   * - 其他返回值：整体作为业务数据，并使用默认提示。
   */
  private toEnvelope(data: unknown, httpCode: number, locale: Request['locale']): ApiResponse<unknown> | StreamableFile | Buffer {
    if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
      return data;
    }

    const defaultMessage = translate(locale, 'requestSuccess');
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      const keys = Object.keys(record);
      const hasOwnMessage = Object.hasOwn(record, 'message');
      const message = typeof record.message === 'string' && record.message.length > 0 ? record.message : defaultMessage;

      if (hasOwnMessage && keys.length === 1) {
        return { code: httpCode, message, data: null };
      }

      const isMessageWithData = hasOwnMessage && Object.hasOwn(record, 'data') && keys.length === 2 && keys.every((key) => key === 'message' || key === 'data');
      if (isMessageWithData) {
        return { code: httpCode, message, data: record.data };
      }
    }

    return {
      code: httpCode,
      message: defaultMessage,
      data,
    };
  }
}

export class ResponseResult<T = any> {
  private code: number;
  private message: string;
  private data: T;

  private constructor(code: number, message: string, data: T = null as T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  /**
   * 初始化成功响应
   */
  static success(message = 'Operation successful') {
    return new ResponseResult(200, message, null);
  }

  /**
   * 初始化失败响应
   */
  static fail(message = 'Operation failed', code = 400) {
    return new ResponseResult(code, message, null);
  }

  /**
   * 链式注入/更新数据，并自动推导响应泛型类型
   */
  with<D>(data: D): ResponseResult<D> {
    return new ResponseResult<D>(this.code, this.message, data);
  }

  /**
   * 输出最终 JSON 对象
   */
  toJSON(): ApiResponse<T> {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}
