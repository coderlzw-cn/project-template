/** 应用实际提供的语言资源。使用完整 BCP 47 标签，避免语言名与资源目录不一致。 */
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** 未携带语言偏好或语言不受支持时使用简体中文。 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

/** 将常见的语言标签归一到应用已提供的区域语言资源。 */
export const LANGUAGE_FALLBACKS: Readonly<Record<string, SupportedLanguage>> = {
  'zh-*': 'zh-CN',
  'en-*': 'en-US',
};
