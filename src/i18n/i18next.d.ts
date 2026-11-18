import 'i18next';
import { DEFAULT_LANGUAGE } from './language';
import { zhCNResource } from './locales/zh-CN';

declare module 'i18next' {
  interface CustomTypeOptions {
    // 与运行时配置保持一致，让 t() 默认从 common 推导 key，并在编译期拒绝不存在的 key。
    defaultNS: 'common';
    strictKeyChecks: true;
    returnNull: false;
    returnEmptyString: false;
    // 直接从默认语言的 TS 资源推导 key 和插值参数，无需生成类型文件。
    resources: typeof zhCNResource;
  }
}
