import { notFound } from "next/navigation";
import { profile } from "@/data/profile";
import { hasLocale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { shareImage, shareSize, shareType } from "@/lib/og";
import { pickVersion } from "@/lib/posts";

// A post's card: its title in its own language, under the blog label, date and reading time.
export async function generateImageMetadata({ params }: { params: { lang: string; slug: string } }) {
  const post = hasLocale(params.lang) ? pickVersion(params.slug, params.lang) : undefined;
  return post ? [{ id: "card", alt: post.title, size: shareSize, contentType: shareType }] : [];
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const post = hasLocale(lang) ? pickVersion(slug, lang) : undefined;
  if (!hasLocale(lang) || !post) notFound();
  const dict = await dictionaryFor(lang);
  return shareImage({
    locale: lang,
    titleLang: post.lang,
    name: profile.name[lang],
    kicker: `${dict.nav.blog} · ${post.date}`,
    title: post.title,
    meta: dict.blog.minutes.replace("{n}", String(post.readingMinutes)),
  });
}
