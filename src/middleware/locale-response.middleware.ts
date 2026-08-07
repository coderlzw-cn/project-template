import { DEFAULT_LANGUAGE } from '@/constants/i18n.constants';
import type { NextFunction, Request, Response } from 'express';

/**
 * 声明本次响应实际使用的语言，并通知浏览器/CDN 按 Accept-Language 隔离缓存。
 * 必须注册在 I18nMiddleware 之后，才能读取已经解析、归一化的 i18nLang。
 */
export function LocaleResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Language', req.i18nLang ?? DEFAULT_LANGUAGE);
  res.vary('Accept-Language');
  next();
}
