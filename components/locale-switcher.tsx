"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { htmlLang, localeCookie, localeNames, type Locale } from "@/i18n/config";

const oneYear = 60 * 60 * 24 * 365;

// The other language's name in that language, tagged so screen readers say it right. It is also the link's
// accessible name, so voice control can use what's on screen; "switch language" goes in the title as a hint.
// On English pages 中文 is set in a system font (see --font-zh-system in globals.css).
export function LocaleName({ locale }: { locale: Locale }) {
  return (
    <span lang={htmlLang[locale]} className="zh:font-zh-system">
      {localeNames[locale]}
    </span>
  );
}

type Props = {
  currentLocale: Locale;
  targetLocale: Locale;
  label: string;
  className?: string;
};

export function LocaleSwitcher({ currentLocale, targetLocale, label, className }: Props) {
  const pathname = usePathname();
  // "/zh/blog" -> "/en/blog": swap only the locale segment, keep the rest.
  const href = `/${targetLocale}${pathname.slice(currentLocale.length + 1)}`;

  return (
    <Link
      href={href}
      hrefLang={targetLocale}
      title={label}
      className={className}
      onClick={() => {
        document.cookie = `${localeCookie}=${targetLocale}; path=/; max-age=${oneYear}; samesite=lax`;
      }}
    >
      <LocaleName locale={targetLocale} />
    </Link>
  );
}
