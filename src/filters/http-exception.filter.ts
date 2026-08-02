import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExceptionVo } from './all-exception.filter';
import { payloadFromHttpException, sanitizePayloadForProduction } from './http-exception-payload';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const { message, error } = sanitizePayloadForProduction(status, payloadFromHttpException(exception));

    response.status(status).json(
      ExceptionVo.build({
        message,
        status,
        timestamp: Date.now(),
        path: request.url,
        method: request.method,
        error,
      }),
    );
  }
}
