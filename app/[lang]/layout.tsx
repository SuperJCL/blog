import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { htmlLang, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { pageTitle, siteUrl } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Pages add canonical, hreflang and share fields with lib/site.ts's pageMeta; relative URLs resolve
// against metadataBase.
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: dict.meta.title,
      template: pageTitle("%s", dict.meta.title),
    },
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <html lang={htmlLang[locale]} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        {/* Every page's <main> has id="main" (components/page.tsx, the homepage's slide pager). */}
        <a href="#main" className="skip-link">
          {dict.nav.skip}
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
