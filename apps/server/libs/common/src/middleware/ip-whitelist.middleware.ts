import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { buildAbnormalResponse } from './abnormal-response';

export interface IpWhitelistOptions {
  /** 允许访问的 IP 列表，支持精确匹配 */
  allowList: string[];
  /** 白名单生效路径，默认全部路径 */
  paths?: string[];
  /** 白名单不生效路径，支持前缀匹配 */
  excludePaths?: string[];
}

/**
 * IP 白名单 middleware。
 * 功能：
 * - 按客户端 IP 拦截访问，适合内部管理接口、Webhook、健康检查等场景。
 * - 优先读取 `req.clientIp`，其次读取 `x-forwarded-for` 和 socket remoteAddress。
 * - 不建议无配置地全局启用，避免反向代理或本地环境下误拦截。
 *
 * @example
 * app.use(IpWhitelistMiddleware({ allowList: ['127.0.0.1'], paths: ['/internal'] }));
 */
export function IpWhitelistMiddleware(options: IpWhitelistOptions) {
  const allowSet = new Set(options.allowList);
  const paths = options.paths ?? ['/'];
  const excludePaths = options.excludePaths ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    const enabledForPath = paths.some((path) => url.startsWith(path));
    const excluded = excludePaths.some((path) => url.startsWith(path));

    if (!enabledForPath || excluded) {
      next();
      return;
    }

    const forwardedFor = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
    const ip = req.clientIp ?? forwardedFor ?? req.socket.remoteAddress ?? '';

    if (allowSet.has(ip)) {
      next();
      return;
    }

    res.status(HttpStatus.FORBIDDEN).json(
      buildAbnormalResponse({
        statusCode: HttpStatus.FORBIDDEN,
        message: '当前 IP 不允许访问',
        request: req,
      }),
    );
  };
}
