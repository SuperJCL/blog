export const locales = ["en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// URL segment stays short; <html lang> uses the full tag for fonts and screen readers.
export const htmlLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
};
