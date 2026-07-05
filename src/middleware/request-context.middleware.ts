import { randomUUID } from 'node:crypto';
import { NextFunction, type Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const API_VERSION_HEADER = 'x-api-version';

/**
 * 请求上下文 middleware。
 * 功能：
 * - 在请求刚进入 Express 时生成或透传 `x-request-id`。
 * - 将 `requestId/startTime/clientIp/apiVersion` 挂到 req 上，供 guard、pipe、filter、interceptor 和业务代码复用。
 * - 将 `x-request-id` 写回响应头，方便前端、网关、日志系统串联一次请求。
 *
 * @example
 * app.use(RequestContextMiddleware);
 */
export function RequestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0 ? incomingRequestId : randomUUID();

  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;
  console.log(ip);

  req.requestId = requestId;
  req.clientIp = ip;

  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
