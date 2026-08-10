import i18n, { dir } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { appStorage } from '@/lib/app-storage';
import {
  DEFAULT_LANGUAGE,
  matchSupportedLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from './constants';
import { localeTransitions } from './loadLangsToResouerce';
import type { NamespaceName } from './localeResources.generated';

/**
 * 同步浏览器语言语义。dir 由 i18next 推导，未来增加阿拉伯语等 RTL 语言时无需再改布局入口。
 */
function setDocumentLanguage(
  language = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE,
) {
  if (typeof document === 'undefined') return;

  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = normalizedLanguage;
  document.documentElement.dir = dir(normalizedLanguage);
}

// namespace 直接从默认语言资源派生，新增业务语言包时无需手动维护初始化配置。
const namespaces = Object.keys(
  localeTransitions[DEFAULT_LANGUAGE],
) as NamespaceName[];

/**
 * 优先级：已持久化的用户选择 > 浏览器语言列表 > 默认语言。
 * 每个浏览器候选项都先经过白名单匹配，避免把 fr-FR 等未支持值伪装成 Language。
 */
export function getBrowserLocale(): Language {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const browserLanguage of browserLanguages) {
    const supportedLanguage = matchSupportedLanguage(browserLanguage);
    if (supportedLanguage) return supportedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

const initialLanguage = appStorage.get('language') ?? getBrowserLocale();

export const i18nReady = i18n
  .on('languageChanged', setDocumentLanguage)
  .use(initReactI18next)
  .init({
    resources: localeTransitions, // 语言包资源
    lng: initialLanguage, // 当前初始化语言
    fallbackLng: DEFAULT_LANGUAGE, // 找不到翻译时降级语言
    supportedLngs: SUPPORTED_LANGUAGES, // 允许使用的语言列表
    load: 'currentOnly', // 仅加载当前选中语言，不去加载全部语种
    ns: namespaces, // 翻译命名空间列表
    defaultNS: 'common', // 默认翻译命名空间
    initAsync: false, // 是否异步初始化，false=同步阻塞初始化
    returnNull: false, // 缺失翻译键时禁止返回 null
    returnEmptyString: false, // 缺失翻译键时禁止返回空字符串
    returnObjects: false, // 禁止翻译返回对象，只返回字符串
    ignoreJSONStructure: false, // 严格校验JSON翻译结构，关闭宽松解析
    saveMissing: import.meta.env.DEV, // 开发环境开启上报缺失的翻译key，方便补全文案
    missingKeyHandler: (languages, namespace, key) => {
      console.warn(
        `[i18n] 缺少翻译: languages=${languages.join(',')} namespace=${namespace} key=${key}`,
      );
    },
    interpolation: {
      escapeValue: false, // React 会对文本节点进行转义，重复转义会导致 HTML 实体显示异常。
    },
    react: {
      useSuspense: false, // 所有资源已同步打包，禁用 Suspense 可避免初始化异常时整页进入无边界等待状态。
    },
  })
  .then(() => {
    setDocumentLanguage();
    return i18n;
  })
  .catch((error: unknown) => {
    console.error('[i18n] 初始化失败', error);
    setDocumentLanguage(DEFAULT_LANGUAGE);
    return i18n;
  });

// Vite HMR 销毁旧模块时移除监听，避免开发环境重复注册 languageChanged 回调。
if (import.meta.hot) {
  import.meta.hot.dispose(() =>
    i18n.off('languageChanged', setDocumentLanguage),
  );
}

export default i18n;
