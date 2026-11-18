export const Language = { ZH_CN: "zh-CN", EN_US: "en-US" } as const;
export type Language = (typeof Language)[keyof typeof Language];

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ZH_CN]: "简体中文",
  [Language.EN_US]: "English",
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_LABELS) as Language[];
export const DEFAULT_LANGUAGE = Language.ZH_CN;

/* 是否是受支持的语言 */
export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as Language);
}

/* 获取浏览器语言，优先级：已持久化的用户选择 > 浏览器语言列表 > 默认语言。 */
export function getBrowserLanguage(persistedLanguage?: unknown): Language {
  if (isSupportedLanguage(persistedLanguage)) {
    const storedLanguage = SUPPORTED_LANGUAGES.find(
      language => language.toLowerCase() === persistedLanguage.toLowerCase(),
    );
    if (storedLanguage) return storedLanguage;
  }

  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const supportedLanguage = SUPPORTED_LANGUAGES.find(
      language => language.toLowerCase() === browserLanguage.toLowerCase(),
    );
    if (supportedLanguage) return supportedLanguage;
  }

  return DEFAULT_LANGUAGE;
}
