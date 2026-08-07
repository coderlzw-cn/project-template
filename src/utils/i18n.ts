import { I18nContext } from 'nestjs-i18n';

/**
 * 在无法使用依赖注入的过滤器、拦截器和函数式中间件中读取当前请求语言。
 * fallback 只用于请求上下文尚未建立或资源异常缺失的兜底，不应替代翻译资源。
 */
export function translateMessage(key: string, fallback: string): string {
  const translated = I18nContext.current()?.t(key);
  return typeof translated === 'string' && translated !== key ? translated : fallback;
}
