import { profile } from "@/data/profile";
import { hasLocale, htmlLang, locales } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { getPostList } from "@/lib/posts";
import { pageTitle, siteUrl } from "@/lib/site";

// RSS 2.0 feed per UI language, built at build time. It lists the same posts as that language's blog page:
// a post without a translation is in both feeds, linking to its own URL and tagged with its language.
// Summaries only; the full text stays on the site.

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// Posts carry a date only; RSS wants RFC 822.
const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

export async function GET(_request: Request, { params }: RouteContext<"/[lang]/feed.xml">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return new Response("Not found", { status: 404 });
  const dict = await dictionaryFor(lang);
  const posts = getPostList(lang);
  const blogUrl = `${siteUrl}/${lang}/blog`;

  const items = posts.map((post) => {
    const url = `${siteUrl}/${post.lang}/blog/${post.slug}`;
    return [
      "    <item>",
      `      <title>${escape(post.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${rfc822(post.date)}</pubDate>`,
      `      <description>${escape(post.summary)}</description>`,
      `      <dc:creator>${escape(profile.name[lang])}</dc:creator>`,
      `      <dc:language>${htmlLang[post.lang]}</dc:language>`,
      ...post.tags.map((tag) => `      <category>${escape(tag)}</category>`),
      "    </item>",
    ].join("\n");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${escape(pageTitle(dict.blog.title, dict.meta.title))}</title>`,
    `    <link>${blogUrl}</link>`,
    `    <description>${escape(dict.blog.intro)}</description>`,
    `    <language>${htmlLang[lang]}</language>`,
    // The newest post's date rather than the build time, so an unchanged feed reads the same after a deploy.
    ...(posts[0] ? [`    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>`] : []),
    `    <atom:link href="${siteUrl}/${lang}/feed.xml" rel="self" type="application/rss+xml"/>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
