import type { MetadataRoute } from "next";
import { seattleDemo } from "@/data/lab";
import { locales, type Locale } from "@/i18n/config";
import { getPostSlugs, getPostVersions } from "@/lib/posts";
import { getProjectSlugs } from "@/lib/projects";
import { languageLinks, siteUrl } from "@/lib/site";

// Every page in every language it exists in, each with its language versions (the same pairs as the pages'
// hreflang links). A post's fallback page in the other UI language isn't listed: its canonical is the post.
function entries(path: string, languages: readonly Locale[], lastModified?: string): MetadataRoute.Sitemap {
  const alternates = { languages: languageLinks(path, languages, siteUrl) };
  return languages.map((l) => ({ url: `${siteUrl}/${l}${path}`, lastModified, alternates }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["", "/projects", "/blog", "/about", `/lab/${seattleDemo.slug}`].flatMap((path) => entries(path, locales)),
    ...getProjectSlugs().flatMap((slug) => entries(`/projects/${slug}`, locales)),
    ...getPostSlugs().flatMap((slug) => {
      const versions = getPostVersions(slug);
      return entries(`/blog/${slug}`, versions.map((v) => v.lang), versions.map((v) => v.date).sort().at(-1));
    }),
  ];
}
