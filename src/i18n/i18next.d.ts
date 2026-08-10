import 'i18next';
import { DEFAULT_LANGUAGE } from './constants';
import type { LocaleResourceTypes } from './localeResources.generated';

declare module 'i18next' {
  interface CustomTypeOptions {
    // 与运行时配置保持一致，让 t() 默认从 common 推导 key，并在编译期拒绝不存在的 key。
    defaultNS: 'common';
    strictKeyChecks: true;
    returnNull: false;
    returnEmptyString: false;
    // 所有 locale 的结构由生成脚本校验一致，因此使用默认语言作为 canonical 类型源。
    resources: LocaleResourceTypes[typeof DEFAULT_LANGUAGE];
  }
}
