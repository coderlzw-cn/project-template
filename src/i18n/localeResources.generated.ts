// 此文件由 scripts/generate-i18n-types.mjs 自动生成，请勿手动修改。
import type { Resource } from 'i18next';
import type resource0 from './locales/en-US/common.json';
import type resource1 from './locales/zh-CN/common.json';

export type LocaleName = 'en-US' | 'zh-CN';
export type NamespaceName = 'common';

export interface LocaleResourceTypes extends Resource {
  'en-US': {
    common: typeof resource0;
  };
  'zh-CN': {
    common: typeof resource1;
  };
}
