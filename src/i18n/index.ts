import i18n, { dir } from "i18next";
import { initReactI18next } from "react-i18next";

import { zhCNResource } from "./locales/zh-CN";
import { enUSResource } from "./locales/en-US";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getBrowserLanguage,
} from "./language";
import { useAppStore } from "@/stores/app";

// 同步浏览器语言语义
const setDocumentLanguage = (language: string) => {
  if (typeof document === "undefined" || !language) return;
  document.documentElement.lang = language;
  document.documentElement.dir = dir(language);
}

// namespace 直接从默认语言资源派生
const namespaces = Object.keys(zhCNResource);


// 优先级：已持久化的用户选择 > 浏览器语言列表 > 默认语言。
export const initialLanguage = getBrowserLanguage(useAppStore.getState().language);
console.log(import.meta.env);


export const i18nReady = i18n
  .on("languageChanged", setDocumentLanguage)
  .use(initReactI18next)
  .init({
    resources: {
      "zh-CN": zhCNResource,
      "en-US": enUSResource,
    },
    lng: initialLanguage, // 当前初始化语言
    fallbackLng: DEFAULT_LANGUAGE, // 找不到翻译时降级语言
    supportedLngs: SUPPORTED_LANGUAGES, // 允许使用的语言列表
    ns: namespaces, // 翻译命名空间列表
    // defaultNS: "common", // 默认翻译命名空间
    saveMissing: import.meta.env.DEV, // 开发环境在控制台打印缺失的翻译键
    missingKeyHandler: (languages, namespace, key) => { console.warn(`[i18n] 缺少翻译: languages=${languages.join(",")} namespace=${namespace} key=${key}`,); },
  })
  .then(() => {
    console.info("[i18n] 初始化完成，当前语言:", i18n.language);
    return i18n;
  })
  .catch((error: unknown) => {
    console.error("[i18n] 初始化失败", error instanceof Error ? error.message : error);
    return i18n;
  });


export default i18n;
