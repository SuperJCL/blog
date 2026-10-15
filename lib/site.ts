import type { Metadata } from "next";
import { defaultLocale, htmlLang, locales, type Locale } from "@/i18n/config";

// The production address. Canonical and hreflang links, the sitemap, share cards and structured data are
// built on it; with a custom domain this is the only line to change.
export const siteUrl = "https://charliejiangblog.vercel.app";

// Google Search Console ownership check for siteUrl (a public token, shown in every page's head).
export const googleSiteVerification = "p7_63HssefTCUmGz6sQMJIcvQgeAjRRubqa1C-HX22g";

// "Projects · Chenglin Jiang". The root layout's title template uses the same shape.
export const pageTitle = (title: string, site: string) => `${title} · ${site}`;

// hreflang targets for a page: each language it exists in, and x-default on the English version.
// Relative for metadata (resolved against metadataBase); the sitemap passes siteUrl as `base`.
export function languageLinks(path: string, languages: readonly Locale[] = locales, base = "") {
  return {
    ...Object.fromEntries(languages.map((l) => [htmlLang[l], `${base}/${l}${path}`])),
    "x-default": `${base}/${languages.includes(defaultLocale) ? defaultLocale : languages[0]}${path}`,
  };
}

// Open Graph writes locales as language_TERRITORY.
const ogLocale: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

type PageMetaInput = {
  locale: Locale; // the language of this URL's content
  path: string; // the part after the locale: "" for the homepage, "/blog/bilingual"
  site: string; // the site name in that language
  title: string; // the page's own title; the homepage passes its full title with `home`
  home?: boolean;
  description: string;
  languages?: readonly Locale[]; // the versions that exist; every language by default
  article?: { publishedTime?: string; tags?: string[] };
};

// Canonical, hreflang (with x-default on the English version) and share-card fields for one page.
// Metadata merges shallowly, so every page passes all of it, not just what differs from the layout.
export function pageMeta({ locale, path, site, title, home = false, description, languages = locales, article }: PageMetaInput): Metadata {
  const url = `/${locale}${path}`;
  const fullTitle = home ? title : pageTitle(title, site);
  return {
    title: home ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageLinks(path, languages) },
    openGraph: {
      type: article ? "article" : "website",
      url,
      siteName: site,
      title: fullTitle,
      description,
      locale: ogLocale[locale],
      alternateLocale: languages.filter((l) => l !== locale).map((l) => ogLocale[l]),
      ...(article ? { publishedTime: article.publishedTime, tags: article.tags } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}
