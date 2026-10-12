import Link from "next/link";
import { Suspense } from "react";
import { localeNames, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const targetLocale = locales.find((l) => l !== locale) ?? locale;

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/projects`, label: dict.nav.projects },
    { href: `/${locale}/blog`, label: dict.nav.blog },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <nav aria-label={dict.nav.label}>
        <ul className="flex flex-wrap gap-4">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Fallback for prerendered shells where the pathname is unknown: link to the other home page. */}
      <Suspense
        fallback={
          <Link href={`/${targetLocale}`} hrefLang={targetLocale}>
            {localeNames[targetLocale]}
          </Link>
        }
      >
        <LocaleSwitcher
          currentLocale={locale}
          targetLocale={targetLocale}
          label={dict.localeSwitcher.label}
        />
      </Suspense>
    </header>
  );
}
