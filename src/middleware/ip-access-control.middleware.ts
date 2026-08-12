import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

/**
 * IP 访问控制 middleware。
 * 功能：
 * - 按客户端 IP 拦截访问，适合内部管理接口、Webhook、健康检查等场景。
 * - 黑名单优先级高于白名单，命中黑名单直接拒绝。
 * - 配置白名单时，只有白名单 IP 可以访问；不配置白名单时，非黑名单 IP 默认放行。
 * - 优先读取 `req.clientIp`，其次读取 `x-forwarded-for` 和 socket remoteAddress。
 * - 不建议无配置地全局启用，避免反向代理或本地环境下误拦截。
 *
 * @example
 * app.use(IpAccessControlMiddleware({ allowList: ['127.0.0.1'], paths: ['/internal'] }));
 * app.use(IpAccessControlMiddleware({ blockList: ['192.168.1.100'] }));
 */
export function IpAccessControlMiddleware(options: {
  /** 允许访问的 IP 列表，支持精确匹配 */
  allowList?: string[];
  /** 禁止访问的 IP 列表，支持精确匹配，优先级高于 allowList */
  blockList?: string[];
  /** IP 访问控制生效路径，默认全部路径 */
  paths?: string[];
  /** IP 访问控制不生效路径，支持前缀匹配 */
  excludePaths?: string[];
}) {
  const i18n = I18nContext.current();

  const allowSet = new Set(options.allowList ?? []);
  const blockSet = new Set(options.blockList ?? []);
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

    if (blockSet.has(ip)) {
      res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: i18n?.t('common.IP_BLOCKED') ?? '当前 IP 已被禁止访问',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });
      return;
    }

    if (allowSet.size === 0 || allowSet.has(ip)) {
      next();
      return;
    }

    res.status(HttpStatus.FORBIDDEN).json({
      statusCode: HttpStatus.FORBIDDEN,
      message: i18n?.t('common.IP_NOT_ALLOWED') ?? '当前 IP 不允许访问',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });
  };
}
