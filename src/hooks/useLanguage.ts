import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import reactI18n from "@/i18n";
import { Language, type LanguageType } from "@/i18n/constants";

export interface LanguageOption {
  value: LanguageType;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    value: Language.ZH_CN,
    label: "简体中文",
  },
  {
    value: Language.EN_US,
    label: "English",
  },
];

export function useLanguage() {
  const { t, i18n } = useTranslation();

  const setLanguage = useCallback(async (language: LanguageType) => {
    if (reactI18n.language === language) return;
    await reactI18n.changeLanguage(language);
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, []);

  return {
    t,
    language: i18n.language, // 当前语言
    setLanguage,
  };
}
