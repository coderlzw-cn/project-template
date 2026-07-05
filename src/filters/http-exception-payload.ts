import { isProduction } from '@/utils/env';
import { HttpException, HttpStatus } from '@nestjs/common';

export interface HttpExceptionPayload {
  message: string | string[];
  error?: string;
}

/** 生产环境不返回参数/校验类错误的明细（避免暴露字段名、约束规则等） */
const CLIENT_INPUT_ERROR_STATUS = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY]);

/** 解析 HttpException.getResponse()，覆盖校验错误（message 为数组）等情况 */
export function payloadFromHttpException(exception: HttpException): HttpExceptionPayload {
  const res = exception.getResponse();
  if (typeof res === 'string') {
    return { message: res };
  }
  if (typeof res === 'object' && res !== null) {
    const body = res as Record<string, unknown>;
    const msg = body.message;
    if (Array.isArray(msg)) {
      return {
        message: msg.filter((m): m is string => typeof m === 'string'),
        error: typeof body.error === 'string' ? body.error : undefined,
      };
    }
    if (typeof msg === 'string') {
      return {
        message: msg,
        error: typeof body.error === 'string' ? body.error : undefined,
      };
    }
  }
  return { message: exception.message };
}

/** 生产环境下将 400/422 等客户端入参错误统一为简短文案 */
export function sanitizePayloadForProduction(status: number, payload: HttpExceptionPayload): HttpExceptionPayload {
  if (!isProduction) {
    return payload;
  }
  if (!CLIENT_INPUT_ERROR_STATUS.has(status)) {
    return payload;
  }
  return { message: '请求参数有误' };
}
