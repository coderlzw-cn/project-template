// oxlint-disable import/no-named-as-default-member
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

import commonZh from "./locales/zh/common.json";
import commonEn from "./locales/en/common.json";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: commonZh,
      },
      en: {
        common: commonEn,
      },
    },
    lng: "zh",
    fallbackLng: "en",
    ns: ["common", "login"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

import common from "./locales/zh/common.json";

export type CommonSchema = typeof common;
