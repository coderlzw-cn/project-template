import { enUSCommon } from './locales/en-US/common';
import { zhCommon } from './locales/zh-CN/common';
import { enUSValidation } from './locales/en-US/validation';
import { zhValidation } from './locales/zh-CN/validation';
import { enUSHome } from './locales/en-US/home';
import { zhHome } from './locales/zh-CN/home';

// 将文案字面量放宽为 string，只校验语言包结构，允许不同语言使用不同文案。
type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]>;
};

export const resources = {
  'zh-CN': { common: zhCommon, validation: zhValidation, home: zhHome },
  'en-US': { common: enUSCommon, validation: enUSValidation, home: enUSHome },
} as const satisfies Record<
  string,
  TranslationShape<{
    common: typeof zhCommon;
    validation: typeof zhValidation;
    home: typeof zhHome;
  }>
>;

export type LocaleName = keyof typeof resources;
