import type { LocaleName } from './localeResources.generated';

export const Language = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const satisfies Record<string, LocaleName>;

export type Language = LocaleName;

export const DEFAULT_LANGUAGE = Language.ZH_CN;

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ZH_CN]: '简体中文',
  [Language.EN_US]: 'English',
};

/**
 * i18next 的语言白名单由标签配置派生。生成的 LocaleName 会强制每个 locales 目录都有标签，
 * 因此新增语言时若忘记补充 LANGUAGE_LABELS，TypeScript 会直接报错。
 */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_LABELS) as Language[];

/** 仅接受项目明确支持的完整语言标签，用于校验持久化值和外部输入。 */
export function isSupportedLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    SUPPORTED_LANGUAGES.some(language => language === value)
  );
}

/**
 * 将 en、en-GB、zh_Hans 等区域变体匹配到项目支持的语言。
 * 无法匹配时返回 undefined，由调用方决定使用默认语言还是继续尝试其他候选项。
 */
export function matchSupportedLanguage(value: unknown): Language | undefined {
  if (typeof value !== 'string') return undefined;

  // zh_CN → zh-cn
  const normalizedValue = value.trim().replaceAll('_', '-').toLowerCase();
  if (!normalizedValue) return undefined;

  // 优先进行完整编码精准匹配（例：zh‑CN、en‑US）
  const exactLanguage = SUPPORTED_LANGUAGES.find(
    language => language.toLowerCase() === normalizedValue,
  );
  if (exactLanguage) return exactLanguage;

  // 精准匹配失败，则只匹配主语言码（例：传入 zh‑hk 命中 zh‑CN）
  const languageCode = normalizedValue.split('-')[0];
  return SUPPORTED_LANGUAGES.find(
    language => language.toLowerCase().split('-')[0] === languageCode,
  );
}

/** 将任意语言标签归一化为项目支持的语言，无法匹配时回退到默认语言。 */
export function normalizeLanguage(value: unknown): Language {
  return matchSupportedLanguage(value) ?? DEFAULT_LANGUAGE;
}
