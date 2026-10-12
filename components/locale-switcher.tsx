"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeCookie, localeNames, type Locale } from "@/i18n/config";

const oneYear = 60 * 60 * 24 * 365;

type Props = {
  currentLocale: Locale;
  targetLocale: Locale;
  label: string;
};

export function LocaleSwitcher({ currentLocale, targetLocale, label }: Props) {
  const pathname = usePathname();
  // "/zh/blog" -> "/en/blog": swap only the locale segment, keep the rest.
  const href = `/${targetLocale}${pathname.slice(currentLocale.length + 1)}`;

  return (
    <Link
      href={href}
      hrefLang={targetLocale}
      aria-label={label}
      onClick={() => {
        document.cookie = `${localeCookie}=${targetLocale}; path=/; max-age=${oneYear}; samesite=lax`;
      }}
    >
      {localeNames[targetLocale]}
    </Link>
  );
}
