import { contact, profile } from "@/data/profile";
import { htmlLang, type Locale } from "@/i18n/config";
import { siteUrl } from "./site";

// schema.org data for search engines, built only from what the site already shows publicly.

const personId = `${siteUrl}/#person`;

export function personData(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: profile.name[locale],
    alternateName: profile.name[locale === "en" ? "zh" : "en"],
    url: `${siteUrl}/${locale}`,
    image: `${siteUrl}/portrait.webp`,
    jobTitle: profile.role[locale],
    description: profile.summary[locale],
    homeLocation: { "@type": "Place", name: profile.location[locale] },
    email: `mailto:${contact.email}`,
    sameAs: contact.links.map((link) => link.href),
  };
}

type PostInput = { title: string; summary: string; date: string; lang: Locale; slug: string; tags: string[] };

export function postData(post: PostInput, locale: Locale) {
  const url = `${siteUrl}/${post.lang}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    inLanguage: htmlLang[post.lang],
    keywords: post.tags.join(", "),
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", "@id": personId, name: profile.name[locale], url: `${siteUrl}/${locale}/about` },
  };
}
