import { isDevelopment } from '@/utils/env';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

/** 生产环境不返回参数/校验类错误的明细（避免暴露字段名、约束规则等） */
const CLIENT_INPUT_ERROR_STATUS = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY]);

/** 解析 HttpException.getResponse()，覆盖校验错误（message 为数组）等情况 */
export function payloadFromHttpException(exception: HttpException) {
  const response = exception.getResponse();

  if (typeof response === 'string') return { message: response };

  if (typeof response === 'object' && response !== null) {
    const message = response['message'] as unknown;

    if (typeof message === 'string') {
      return {
        message,
        error: typeof response['error'] === 'string' ? response['error'] : undefined,
      };
    }

    // 这种情况通常是参数 validate 框架抛出的异常
    if (Array.isArray(message)) {
      return {
        message: message.filter((m): m is string => typeof m === 'string'),
        error: typeof response['error'] === 'string' ? response['error'] : undefined,
      };
    }
  }
  return { message: exception.message };
}

/**
 * 国际化翻译
 * @param host
 * @param status
 * @param payload
 * @returns
 */
export function localizeHttpExceptionPayload(
  host: ArgumentsHost,
  status: number,
  payload: {
    message: string | string[];
    error?: string;
  },
) {
  const i18n = I18nContext.current(host);

  // 生产环境下，直接提示“请求参数错误”，不显示详细的错误字段
  if (!isDevelopment && CLIENT_INPUT_ERROR_STATUS.has(status)) {
    return { message: i18n ? i18n.t('common.HTTP_ERROR.400') : '请求参数错误' };
  }

  if (typeof payload.message === 'string') {
    const translated = i18n ? i18n.t(`common.HTTP_ERROR.${status}`) : `common.HTTP_ERROR.${status}`;
    return {
      ...payload,
      message: payload.message ? payload.message : translated === `common.HTTP_ERROR.${status}` ? payload.message : translated,
    };
  }

  return payload;
}

export class ExceptionVo {
  static build(values: { message: string | string[]; status: number; timestamp: number; path: string; method: string; error?: string }) {
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
