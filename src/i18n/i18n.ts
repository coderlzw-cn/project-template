const zhCNMessages = {
  requestSuccess: '请求成功',
  requestTimeout: '请求处理超过 {timeoutMs}ms',
  invalidRequestParameters: '请求参数有误',
  internalServerError: '服务器错误，请稍后重试',
  maintenance: '系统维护中，请稍后再试',
  ipBlocked: '当前 IP 已被禁止访问',
  ipNotAllowed: '当前 IP 不允许访问',
} as const;

export type TranslationKey = keyof typeof zhCNMessages;
export type SupportedLocale = 'zh-CN' | 'en-US';

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

const messages: Record<SupportedLocale, Record<TranslationKey, string>> = {
  'zh-CN': zhCNMessages,
  'en-US': {
    requestSuccess: 'Request successful',
    requestTimeout: 'Request processing exceeded {timeoutMs}ms',
    invalidRequestParameters: 'Invalid request parameters',
    internalServerError: 'Internal server error. Please try again later',
    maintenance: 'The system is under maintenance. Please try again later',
    ipBlocked: 'This IP address has been blocked',
    ipNotAllowed: 'This IP address is not allowed',
  },
};

/** 根据 Accept-Language 协商当前支持的语言，无法匹配时回退到中文。 */
export function resolveLocale(acceptLanguage: string | string[] | undefined): SupportedLocale {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage;
  if (!header) return DEFAULT_LOCALE;

  const languageRanges = header
    .split(',')
    .map((part, index) => {
      const [language = '', ...parameters] = part.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return {
        language: language.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter(({ language, quality }) => language.length > 0 && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const { language } of languageRanges) {
    if (language === 'en' || language.startsWith('en-')) {
      return 'en-US';
    }
    if (language === 'zh' || language.startsWith('zh-')) {
      return 'zh-CN';
    }
  }

  return DEFAULT_LOCALE;
}

/** 翻译固定系统文案，并替换 `{name}` 形式的参数。 */
export function translate(locale: SupportedLocale | undefined, key: TranslationKey, parameters: Record<string, string | number> = {}): string {
  const template = messages[locale ?? DEFAULT_LOCALE][key];
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (Object.prototype.hasOwnProperty.call(parameters, name) ? String(parameters[name]) : placeholder));
}
