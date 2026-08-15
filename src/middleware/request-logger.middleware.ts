import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';

const logger = new Logger('HTTP');

function shouldSkipRequest(req: Request): boolean {
  const userAgent = req.headers['user-agent'];

  return req.path.startsWith('/swagger') || req.path.startsWith('/health') || userAgent?.includes('Consul Health Check') === true;
}

export function RequestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  if (shouldSkipRequest(req)) {
    next();
    return;
  }

  const startedAt = performance.now();

  res.once('finish', () => {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;

    const log = {
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      clientIp: req.clientIp ?? '-',
      userAgent: req.headers['user-agent'] ?? '-',
      contentLength: res.getHeader('content-length') ?? 0,
    };

    if (res.statusCode >= 500) {
      logger.error(log);
    } else if (res.statusCode >= 400) {
      logger.warn(log);
    } else {
      logger.log(log);
    }
  });

  next();
}
