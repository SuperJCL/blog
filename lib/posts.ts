import { allPosts } from "content-collections";
import type { Locale } from "@/i18n/config";

export type Post = (typeof allPosts)[number];

// Drafts show up in `next dev` only.
const posts = allPosts.filter(
  (post) => process.env.NODE_ENV !== "production" || !post.draft,
);

export function getPostSlugs(): string[] {
  return [...new Set(posts.map((post) => post.slug))];
}

export function getPostVersions(slug: string): Post[] {
  return posts.filter((post) => post.slug === slug);
}

// The version shown for a UI language: the post in that language, otherwise the one that exists.
export function pickVersion(slug: string, locale: Locale): Post | undefined {
  const versions = getPostVersions(slug);
  return versions.find((post) => post.lang === locale) ?? versions[0];
}

// One entry per slug, newest first.
export function getPostList(locale: Locale): Post[] {
  return getPostSlugs()
    .map((slug) => pickVersion(slug, locale))
    .filter((post): post is Post => post !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date));
}
