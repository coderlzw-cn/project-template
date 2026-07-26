import { resolveLocale } from '@/i18n/i18n';
import { NextFunction, Request, Response } from 'express';

/**
 * 根据 Accept-Language 设置当前请求语言。
 * 当前支持 zh-CN、en-US，不支持的语言回退到 zh-CN。
 */
export function LocaleMiddleware(req: Request, res: Response, next: NextFunction) {
  req.locale = resolveLocale(req.headers['accept-language']);
  res.setHeader('Content-Language', req.locale);
  res.vary('Accept-Language');
  next();
}
