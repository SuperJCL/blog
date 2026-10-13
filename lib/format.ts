import { htmlLang, type Locale } from "@/i18n/config";

// Dates in content are plain `YYYY-MM-DD`; format in UTC so the day never shifts with the server's time zone.
export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(htmlLang[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}

// "2023-03" → "2023.03" in Chinese, "Mar 2023" in English; a bare year stays as it is.
export function formatYearMonth(value: string, locale: Locale): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  if (locale === "zh") return `${year}.${month}`;
  return new Intl.DateTimeFormat(htmlLang[locale], { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}-01T00:00:00Z`),
  );
}

// `present` labels a period that hasn't ended, e.g. 至今 / Present.
export function formatPeriod(start: string, end: string | undefined, locale: Locale, present: string): string {
  return `${formatYearMonth(start, locale)} – ${end ? formatYearMonth(end, locale) : present}`;
}
