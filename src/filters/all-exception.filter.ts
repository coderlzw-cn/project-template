import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { isProduction } from '../utils/env';
import { resolveDatabaseError } from './database-error';
import { ExceptionVo } from './http-exception-payload';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const i18n = I18nContext.current(host);
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const dbError = resolveDatabaseError(exception);

    let message: string | string[];
    if (dbError) {
      status = dbError.status;
      message = dbError.message;
    } else if (exception instanceof Error) {
      message = isProduction ? (i18n ? i18n.t('common.SYSTEM.ERROR') : '服务器错误，请稍后重试') : exception.message;
    } else {
      message = i18n ? i18n.t('common.SYSTEM.ERROR') : '服务器错误，请稍后重试';
    }

    const path = httpAdapter.getRequestUrl(request) as string;
    const method = httpAdapter.getRequestMethod(request) as string;

    const responseBody = ExceptionVo.build({
      message,
      status: status,
      timestamp: Date.now(),
      path,
      method,
    });

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
