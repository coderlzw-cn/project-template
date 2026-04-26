import 'express';

declare global {
  namespace Express {
    interface Request {
      /** 当前请求的链路 ID，由 RequestContextMiddleware 或 TraceIdInterceptor 写入 */
      requestId?: string;
      /** 请求进入应用的时间戳，单位 ms */
      startTime?: number;
      /** 解析后的客户端 IP，优先取 x-forwarded-for */
      clientIp?: string;
      /** 原始请求体，常用于 Webhook/支付回调签名校验 */
      rawBody?: Buffer;
      /** 从请求头或路径解析出的 API 版本 */
      apiVersion?: string;
    }
  }
}

export {};
