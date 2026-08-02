import { Prisma } from '@/generated/prisma/client';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { isProduction } from '../utils/env';
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

// mariadb 驱动的超时错误码：建连超时 45012、socket 无响应 45026、连接池获取超时 45028
const DRIVER_TIMEOUT_CODES = ['45012', '45026', '45028'];

interface DbErrorInfo {
  status: number;
  message: string;
}

function resolveDatabaseError(exception: unknown): DbErrorInfo | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: '数据已存在，请勿重复提交' };
      case 'P2003':
        return { status: HttpStatus.CONFLICT, message: '数据存在关联，操作失败' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: '数据不存在或已被删除' };
      case 'P2024': // 连接池获取连接超时
      case 'P1008': // 操作超时
        return { status: HttpStatus.GATEWAY_TIMEOUT, message: '数据库响应超时，请稍后重试' };
      case 'P1001': // 数据库不可达
      case 'P1002': // 可达但连接超时
      case 'P1017': // 服务器主动断开连接
        return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库连接失败，请稍后重试' };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: isProduction ? '数据库操作失败，请稍后重试' : exception.message,
        };
    }
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库连接失败，请稍后重试' };
  }

  if (exception instanceof Prisma.PrismaClientUnknownRequestError || exception instanceof Prisma.PrismaClientValidationError) {
    // 驱动层超时错误可能以未知错误形式抛出，通过错误码兜底识别
    if (DRIVER_TIMEOUT_CODES.some((code) => exception.message.includes(code))) {
      return { status: HttpStatus.GATEWAY_TIMEOUT, message: '数据库响应超时，请稍后重试' };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? '数据库操作失败，请稍后重试' : exception.message,
    };
  }

  return null;
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
