import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExceptionVo } from '../vo/exception.vo';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    //在某些情况下，httpAdapter 可能无法在构造函数方法，因此我们应该在这里解析它。
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : exception instanceof Error ? exception.message : '服务器错误，请稍后重试';

    const path = httpAdapter.getRequestUrl(request) as string;
    const method = httpAdapter.getRequestMethod(request) as string;

    const responseBody = ExceptionVo.build({
      message: message,
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path,
      method,
    });

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
