import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { isProduction } from '../utils/env';
import { translateMessage } from '../utils/i18n';
import { resolveDatabaseError } from './database-error';
import { payloadFromHttpException, sanitizePayloadForProduction } from './http-exception-payload';

interface IValues {
  message: string | string[];
  status: number;
  timestamp: number;
  path: string;
  method: string;
  error?: string;
}
export class ExceptionVo {
  static build(values: IValues) {
    const body: Record<string, unknown> = {
      status: values.status,
      timestamp: values.timestamp,
      path: values.path,
      method: values.method,
      message: values.message,
    };
    if (values.error !== undefined) {
      body.error = values.error;
    }
    return body;
  }
}

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // 某些生命周期里 HttpAdapter 需在运行时解析
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    let httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const dbError = resolveDatabaseError(exception);

    // HttpException 通常由 HttpExceptionFilter 处理；若仍落入此处，使用相同解析逻辑
    let message: string | string[];
    let error: string | undefined;
    if (exception instanceof HttpException) {
      const payload = sanitizePayloadForProduction(httpStatus, payloadFromHttpException(exception));
      message = payload.message;
      error = payload.error;
    } else if (dbError) {
      httpStatus = dbError.status;
      message = dbError.message;
    } else if (exception instanceof Error) {
      message = isProduction ? translateMessage('common.SERVER_ERROR', '服务器错误，请稍后重试') : exception.message;
    } else {
      message = translateMessage('common.SERVER_ERROR', '服务器错误，请稍后重试');
    }

    const path = httpAdapter.getRequestUrl(request) as string;
    const method = httpAdapter.getRequestMethod(request) as string;

    const responseBody = ExceptionVo.build({
      message,
      status: httpStatus,
      timestamp: Date.now(),
      path,
      method,
      error,
    });

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
