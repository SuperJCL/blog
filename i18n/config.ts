export const locales = ["en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Set when the user switches language; takes priority over Accept-Language.
export const localeCookie = "NEXT_LOCALE";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Each language's own name, identical in every dictionary.
export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

// URL segment stays short; <html lang> uses the full tag for fonts and screen readers.
export const htmlLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
};
