import type { Metadata } from "next";
import { htmlLang, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html lang={htmlLang[locale]}>
      <body>{children}</body>
    </html>
  );
}
