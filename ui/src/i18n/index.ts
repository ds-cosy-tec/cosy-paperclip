import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales } from "./locales";

const LANG_STORAGE_KEY = "paperclip.language";

function detectLanguage(): string {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && supportedLocales.includes(saved)) return saved;
    const browser = navigator.language.split("-")[0];
    if (browser && supportedLocales.includes(browser)) return browser;
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

export function setLanguage(lang: string): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  void i18n.changeLanguage(lang);
}

export function getLanguage(): string {
  return i18n.language ?? DEFAULT_LOCALE;
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
