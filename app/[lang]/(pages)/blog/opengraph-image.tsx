import { notFound } from "next/navigation";
import { profile } from "@/data/profile";
import { hasLocale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { shareImage, shareSize, shareType } from "@/lib/og";
import { pageTitle } from "@/lib/site";

export async function generateImageMetadata({ params }: { params: { lang: string } }) {
  if (!hasLocale(params.lang)) return [];
  const dict = await dictionaryFor(params.lang);
  return [{ id: "card", alt: pageTitle(dict.blog.title, dict.meta.title), size: shareSize, contentType: shareType }];
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await dictionaryFor(lang);
  return shareImage({
    locale: lang,
    name: profile.name[lang],
    kicker: profile.role[lang],
    title: dict.blog.title,
    meta: dict.blog.intro,
  });
}
