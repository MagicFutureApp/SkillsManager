import i18next, { createInstance, type i18n } from "i18next";
import { initReactI18next } from "react-i18next";

import { defaultLocale, type SupportedLocale } from "../../core/i18n/locale";
import { resources } from "./resources";

export const createI18nInstance = async (locale: SupportedLocale): Promise<i18n> => {
  const instance = createInstance();

  await instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: defaultLocale,
    interpolation: {
      escapeValue: false
    }
  });

  return instance;
};

void i18next.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  interpolation: {
    escapeValue: false
  }
});

export const appI18n = i18next;
