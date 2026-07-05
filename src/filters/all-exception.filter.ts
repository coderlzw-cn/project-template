import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { payloadFromHttpException, sanitizePayloadForProduction } from './http-exception-payload';
import { isProduction } from '@/utils/env';
import { ExceptionVo } from '@/exception.vo';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // 某些生命周期里 HttpAdapter 需在运行时解析
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpException 通常由 HttpExceptionFilter 处理；若仍落入此处，使用相同解析逻辑
    let message: string | string[];
    let error: string | undefined;
    if (exception instanceof HttpException) {
      const payload = sanitizePayloadForProduction(httpStatus, payloadFromHttpException(exception));
      message = payload.message;
      error = payload.error;
    } else if (exception instanceof Error) {
      message = isProduction ? '服务器错误，请稍后重试' : exception.message;
    } else {
      message = '服务器错误，请稍后重试';
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
