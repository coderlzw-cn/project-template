import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export function RequestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // 不统计swagger、consul 的请求
  if (req.originalUrl.startsWith('/swagger') || req.originalUrl.startsWith('/health') || req.headers['user-agent']?.includes('Consul Health Check')) {
    next();
    return;
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl;
    const statusCode = res.statusCode;

    Logger.log(`requestId=${req.requestId} ip=${req.clientIp ?? '-'} method=${method} url=${url} status=${statusCode} duration=${duration}ms`, 'HTTP');
  });

  next();
}
