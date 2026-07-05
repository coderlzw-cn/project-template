import { HttpStatus } from '@nestjs/common';
import { NextFunction, type Request, Response } from 'express';

/**
 * 维护模式 middleware。
 * 功能：
 * - 当系统升级、数据迁移或临时停服时，统一返回 503。
 * - 默认放行 `/health`、`/swagger`，避免健康检查和文档不可访问。
 * - 建议通过环境变量或配置中心控制 `enabled`。
 *
 * @example
 * app.use(MaintenanceModeMiddleware({ enabled: process.env.MAINTENANCE_MODE === 'true' }));
 */
export function MaintenanceModeMiddleware(
  options: {
    /** 是否开启维护模式 */
    enabled?: boolean;
    /** 维护模式放行路径，支持前缀匹配 */
    allowPaths?: string[];
    /** 返回给客户端的提示文案 */
    message?: string;
  } = {},
) {
  const allowPaths = options.allowPaths ?? ['/health', '/swagger'];
  const message = options.message ?? '系统维护中，请稍后再试';

  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.enabled || allowPaths.some((path) => req.originalUrl.startsWith(path))) {
      next();
      return;
    }

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });
  };
}
