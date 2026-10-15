import { notFound } from "next/navigation";
import { seattleDemo } from "@/data/lab";
import { profile } from "@/data/profile";
import { hasLocale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { shareImage, shareSize, shareType } from "@/lib/og";
import { pageTitle } from "@/lib/site";
import city from "@/public/lab/seattle/city.json";

// The demo's card: its title over the rendered city (assets/share-seattle.jpg, the page's opening view).
export async function generateImageMetadata({ params }: { params: { lang: string } }) {
  if (!hasLocale(params.lang)) return [];
  const dict = await dictionaryFor(params.lang);
  return [{ id: "card", alt: pageTitle(seattleDemo.title[params.lang], dict.meta.title), size: shareSize, contentType: shareType }];
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await dictionaryFor(lang);
  const buildings = new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US").format(city.counts.buildings);
  return shareImage({
    locale: lang,
    name: profile.name[lang],
    kicker: dict.lab.kicker,
    title: seattleDemo.title[lang],
    meta: dict.lab.shareMeta.replace("{buildings}", buildings),
    cover: "share-seattle.jpg",
  });
}
