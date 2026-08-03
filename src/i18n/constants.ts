export const Language = {
  ZH_CN: "zh-CN",
  EN_US: "en-US",
};

export type LanguageType = (typeof Language)[keyof typeof Language];

export const DEFAULT_LANGUAGE = Language.ZH_CN;

export const SUPPORTED_LANGUAGES = [Language.ZH_CN, Language.EN_US] as const;

export const LANGUAGE_LABELS: Record<LanguageType, string> = {
  [Language.ZH_CN]: "简体中文",
  [Language.EN_US]: "English",
};
