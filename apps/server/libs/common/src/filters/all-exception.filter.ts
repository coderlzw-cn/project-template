import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';

export interface ExceptionResponseBody {
  /** 异常提示；ValidationPipe 的数组消息会原样保留 */
  message: string | string[];
  /** HTTP 状态码 */
  statusCode: number;
  /** ISO 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求方法 */
  method: string;
  /** 请求链路 ID，用于和日志关联 */
  requestId?: string;
  /** Nest/HTTP 异常的错误名或错误描述 */
  error?: string;
}

interface NormalizedException {
  statusCode: number;
  message: string | string[];
  error?: string;
}

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  /**
   * 全局异常出口。
   * 功能：
   * - 同时处理 `HttpException` 和未知异常，项目只需要注册这一个全局 filter。
   * - 兼容 Nest 内置异常响应：`exception.getResponse()` 可能是字符串，也可能是对象。
   * - 保留 ValidationPipe 的 `message: string[]`，方便前端展示字段校验错误。
   * - 自动带上 `requestId/path/method/timestamp`，方便前后端和日志系统排查。
   *
   * @example
   * app.useGlobalFilters(new CatchEverythingFilter(httpAdapterHost));
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    // 在某些情况下，httpAdapter 可能无法在构造函数阶段完整可用，因此在 catch 内读取。
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const normalizedException = this.normalizeException(exception);
    const path = httpAdapter.getRequestUrl(request) as string;
    const method = httpAdapter.getRequestMethod(request) as string;

    const responseBody: ExceptionResponseBody = {
      message: normalizedException.message,
      statusCode: normalizedException.statusCode,
      timestamp: new Date().toISOString(),
      path,
      method,
      requestId: request.requestId,
      error: normalizedException.error,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, normalizedException.statusCode);
  }

  private normalizeException(exception: unknown): NormalizedException {
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception instanceof Error ? exception.message : '服务器错误，请稍后重试',
      error: exception instanceof Error ? exception.name : 'InternalServerError',
    };
  }

  private normalizeHttpException(exception: HttpException): NormalizedException {
    const response = exception.getResponse();
    const statusCode = exception.getStatus();

    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
        error: exception.name,
      };
    }

    if (typeof response === 'object' && response !== null) {
      const record = response as Record<string, unknown>;
      const message = this.resolveMessage(record.message, exception.message);
      const error = typeof record.error === 'string' ? record.error : exception.name;

      return {
        statusCode,
        message,
        error,
      };
    }

    return {
      statusCode,
      message: exception.message,
      error: exception.name,
    };
  }

  private resolveMessage(message: unknown, fallback: string): string | string[] {
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string');
    }

    return fallback;
  }
}
