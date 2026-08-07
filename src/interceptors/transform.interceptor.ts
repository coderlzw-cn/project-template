import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { HTTP_CODE_METADATA, REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';
import { translateMessage } from '../utils/i18n';

export interface ApiResponse<T = any> {
  message: string;
  code?: number;
  data?: T;
}

export class ResponseResult<T = void> {
  private constructor(
    private message: string,
    private code?: number,
    private data?: T,
  ) {}

  /**
   * 1. 纯消息响应：{ message: "..." }
   */
  static msg(message: string): ResponseResult<void> {
    return new ResponseResult<void>(message);
  }

  /**
   * 2. 成功响应
   * - ResponseResult.success('更新成功') -> { message: "更新成功", code: 200 }
   * - ResponseResult.success(data, '更新成功') -> { message: "更新成功", code: 200, data: xxxxx }
   */
  static success(): ResponseResult<void>;
  static success(message: string, code?: number): ResponseResult<void>;
  static success<D>(data: D, message?: string, code?: number): ResponseResult<D>;
  static success<D>(dataOrMessage?: D | string, messageOrCode?: string | number, code = 200): ResponseResult<any> {
    // 情况 A：仅传字符串 message，例如 success('更新成功')
    if (typeof dataOrMessage === 'string') {
      const customCode = typeof messageOrCode === 'number' ? messageOrCode : 200;
      return new ResponseResult<void>(dataOrMessage, customCode);
    }

    // 情况 B：没传参，例如 success()
    if (dataOrMessage === undefined) {
      return new ResponseResult<void>(translateMessage('common.SUCCESS', '请求成功'), 200);
    }

    // 情况 C：传了 data，例如 success(data, '更新成功')
    const msg = typeof messageOrCode === 'string' ? messageOrCode : translateMessage('common.SUCCESS', '请求成功');
    return new ResponseResult<D>(msg, code, dataOrMessage);
  }

  /**
   * 3. 失败/自定义状态码响应
   * - ResponseResult.fail('更新失败', 3001) -> { message: "更新失败", code: 3001 }
   */
  static fail(message?: string, code = 400): ResponseResult<void> {
    return new ResponseResult<void>(message ?? translateMessage('common.OPERATION_FAILED', '操作失败'), code);
  }

  /**
   * 链式设置 code
   */
  setCode(code: number): this {
    this.code = code;
    return this;
  }

  /**
   * 链式注入 data
   */
  with<D>(data: D): ResponseResult<D> {
    return new ResponseResult<D>(this.message, this.code, data);
  }

  /**
   * 序列化钩子：自动清理未设值的字段
   */
  toJSON(): ApiResponse<T> {
    const result: ApiResponse<T> = {
      message: this.message,
    };

    if (this.code !== undefined && this.code !== null) {
      result.code = this.code;
    }

    if (this.data !== undefined && this.data !== null) {
      result.data = this.data;
    }

    return result;
  }
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

    return next.handle().pipe(map((data: unknown) => this.toEnvelope(data, httpCode)));
  }

  /**
   * 将控制器返回值转为统一外壳。
   */
  private toEnvelope(data: unknown, httpCode: number): ApiResponse<unknown> | StreamableFile | Buffer {
    // 1. 流式文件与 Buffer 原样返回
    if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
      return data;
    }

    // 2. 如果控制器直接返回了 ResponseResult 实例，直接调用其 toJSON()
    if (data instanceof ResponseResult) {
      return data.toJSON();
    }

    // 3. 处理普通对象情况
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      const keys = Object.keys(record);
      const hasOwnMessage = Object.hasOwn(record, 'message');
      const message = typeof record.message === 'string' && record.message.length > 0 ? record.message : translateMessage('common.SUCCESS', '请求成功');

      // 3.1 兼容 controller 返回纯 { message: "更新成功" }
      if (hasOwnMessage && keys.length === 1) {
        return { message };
      }

      // 3.2 兼容 controller 返回 { message: "更新成功", code: 200 }
      const isMessageWithCode = hasOwnMessage && Object.hasOwn(record, 'code') && keys.length === 2;
      if (isMessageWithCode) {
        return { message, code: record.code as number };
      }

      // 3.3 兼容 controller 返回 { message: "...", data: ... } 或 { message: "...", code: ..., data: ... }
      const isMessageWithData = hasOwnMessage && Object.hasOwn(record, 'data');
      if (isMessageWithData) {
        const result: ApiResponse<unknown> = { message };
        if (Object.hasOwn(record, 'code')) {
          result.code = record.code as number;
        } else {
          result.code = httpCode;
        }
        if (record.data !== undefined && record.data !== null) {
          result.data = record.data;
        }
        return result;
      }
    }

    // 4. 其它未手动包装的普通返回值（如字符串、数组、标准 DTO），自动补充默认格式
    const result: ApiResponse<unknown> = {
      code: httpCode,
      message: translateMessage('common.SUCCESS', '请求成功'),
    };

    if (data !== undefined && data !== null) {
      result.data = data;
    }

    return result;
  }
}
