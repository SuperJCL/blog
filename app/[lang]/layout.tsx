import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { htmlLang, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { palette } from "@/lib/palette";
import { googleSiteVerification, pageTitle, siteUrl } from "@/lib/site";
import { themeScript } from "@/lib/theme";
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
    verification: { google: googleSiteVerification },
  };
}

// The browser UI takes the page background of the system theme; the toggle repaints it for a chosen theme.
export async function generateViewport(): Promise<Viewport> {
  const [light, dark] = await Promise.all([palette("light"), palette("dark")]);
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: light.bg },
      { media: "(prefers-color-scheme: dark)", color: dark.bg },
    ],
  };
}

// suppressHydrationWarning: the theme script may set data-theme on <html> before React hydrates.
export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <html lang={htmlLang[locale]} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
