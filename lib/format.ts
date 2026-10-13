import { htmlLang, type Locale } from "@/i18n/config";

// Dates in content are plain `YYYY-MM-DD`; format in UTC so the day never shifts with the server's time zone.
export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(htmlLang[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}
