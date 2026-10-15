import { notFound } from "next/navigation";
import { focusAreas, hero } from "@/data/home";
import { profile } from "@/data/profile";
import { hasLocale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { shareImage, shareSize, shareType } from "@/lib/og";

// The homepage's share image: the hero's line next to the portrait. Pages without their own inherit it.
export async function generateImageMetadata({ params }: { params: { lang: string } }) {
  if (!hasLocale(params.lang)) return [];
  const dict = await dictionaryFor(params.lang);
  return [{ id: "card", alt: dict.meta.homeTitle, size: shareSize, contentType: shareType }];
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [lead, accent] = hero.title[lang];
  return shareImage({
    locale: lang,
    name: profile.name[lang],
    kicker: profile.role[lang],
    title: [lead, accent],
    meta: focusAreas.map((area) => area.title[lang]).join(" · "),
    portrait: true,
  });
}
