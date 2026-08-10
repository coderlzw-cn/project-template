import type { LocaleResourceTypes } from './localeResources.generated';

type TranslationNamespace = Record<string, unknown>;
type RuntimeLocaleResources = Record<
  string,
  Record<string, TranslationNamespace>
>;

// eager 模式将 JSON 资源随应用构建，不产生运行时翻译文件请求，也不依赖网络可用性。
const modules = import.meta.glob<TranslationNamespace>('./locales/**/*.json', {
  eager: true,
  import: 'default',
});

const loadedLocaleTransitions = Object.entries(
  modules,
).reduce<RuntimeLocaleResources>((prev, current) => {
  const [path, module] = current;
  const lang = path.match(/\/locales\/([\w-]+)\//);
  const filename = path.match(/\/([\w-]+)\.json$/);

  // 无法识别的路径说明目录约定已被破坏，应立即失败，不能静默漏掉整组翻译。
  if (!filename || !lang) throw new Error(`[i18n] 无法解析语言包路径: ${path}`);

  const langKey = lang[1];
  prev[langKey] = prev[langKey] || {};
  prev[langKey][filename[1]] = module;

  return prev;
}, {});

// 类型文件和运行时资源均由 locales 目录生成；该断言只补回 import.meta.glob 无法保留的路径字面量信息。
export const localeTransitions =
  loadedLocaleTransitions as unknown as LocaleResourceTypes;
