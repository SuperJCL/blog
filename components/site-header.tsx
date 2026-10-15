import Link from "next/link";
import { Suspense } from "react";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { HeaderFrame } from "./header-frame";
import { LocaleName, LocaleSwitcher } from "./locale-switcher";
import { NavLinks, NavList } from "./nav-links";

const pill = "items-center rounded-full px-3 py-1";

export async function SiteHeader() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const targetLocale = locales.find((l) => l !== locale) ?? locale;

  // The brand links home, so home isn't repeated here.
  const items = [
    { href: `/${locale}/projects`, label: dict.nav.projects },
    { href: `/${locale}/blog`, label: dict.nav.blog },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];
  const switcherClass = `${pill} inline-flex border border-line hover:border-fg`;

  return (
    <HeaderFrame className="fixed inset-x-0 top-0 z-20 flex h-nav items-center justify-between gap-4 border-b border-transparent bg-bg/85 px-gutter text-fg backdrop-blur-md transition-colors data-scrolled:border-line hero-on:bg-transparent hero-on:bg-linear-to-b hero-on:from-bg/80 hero-on:to-transparent hero-on:backdrop-blur-none">
      <Link href={`/${locale}`} className="flex items-center gap-2 font-display text-xl leading-none uppercase">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-accent text-sm text-accent-ink">
          ✦
        </span>
        {/* Phones get the short form: the full English name and three links don't fit in 375px. */}
        <span className="max-sm:hidden">{dict.meta.title}</span>
        <span className="sm:hidden">{dict.nav.brandShort}</span>
      </Link>
      <nav
        aria-label={dict.nav.label}
        className="flex items-center gap-3 font-mono text-xs tracking-wider uppercase sm:gap-4 sm:tracking-widest md:gap-7"
      >
        <Suspense fallback={<NavList items={items} />}>
          <NavLinks items={items} />
        </Suspense>
        {/* Fallback for prerendered shells where the pathname is unknown: link to the other home page. */}
        <Suspense
          fallback={
            <Link href={`/${targetLocale}`} hrefLang={targetLocale} title={dict.localeSwitcher.label} className={switcherClass}>
              <LocaleName locale={targetLocale} />
            </Link>
          }
        >
          <LocaleSwitcher
            currentLocale={locale}
            targetLocale={targetLocale}
            label={dict.localeSwitcher.label}
            className={switcherClass}
          />
        </Suspense>
        <Link
          href={`/${locale}/about#contact`}
          className={`${pill} hidden gap-1.5 bg-accent font-medium text-accent-ink md:inline-flex`}
        >
          {dict.nav.contact}
          <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </HeaderFrame>
  );
}
