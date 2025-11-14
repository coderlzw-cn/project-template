import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export function RequestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // 获取客户端真实 IP（处理反向代理的情况）
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;

  // 不统计swagger的请求
  if (req.originalUrl.startsWith('/swagger') || req.headers['user-agent']?.includes('Consul Health Check')) {
    next();
    return;
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl;
    const statusCode = res.statusCode;

    Logger.log(`IP: ${ip} | Method: ${method} | URL: ${url} | Status: ${statusCode} | Time: ${duration}ms`, 'HTTP');
  });

  next();
}
