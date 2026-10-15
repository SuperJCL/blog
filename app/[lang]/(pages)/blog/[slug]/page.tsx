import { MDXContent } from "@content-collections/mdx/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { CodeBlock, Table } from "@/components/mdx/code-block";
import { Arrow, Figure, Flow, Stat, Stats, Step } from "@/components/mdx/media";
import { Page } from "@/components/page";
import { Pager } from "@/components/pager";
import { ReadingProgress } from "@/components/post/reading-progress";
import { Toc } from "@/components/post/toc";
import { htmlLang, localeNames } from "@/i18n/config";
import { dictionaryFor, getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/format";
import { getPostList, getPostSlugs, getPostVersions, pickVersion } from "@/lib/posts";
import { pageMeta } from "@/lib/site";
import { postData } from "@/lib/structured-data";

// Markdown elements and the tags a post can use.
const components = { pre: CodeBlock, table: Table, Table, Figure, Flow, Step, Arrow, Stats, Stat };

// Every slug exists in both UI languages. When the post has no version in the
// page's language, the existing version is shown with a notice instead.
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = pickVersion(slug, await getLocale());
  if (!post) return {};
  // Built for the post's own URL, so on the fallback page (a post shown in the other UI language) the canonical
  // points search engines there. Only the versions that exist get hreflang.
  return pageMeta({
    locale: post.lang,
    path: `/blog/${slug}`,
    site: (await dictionaryFor(post.lang)).meta.title,
    title: post.title,
    description: post.summary,
    languages: getPostVersions(slug).map((v) => v.lang),
    article: { publishedTime: post.date, tags: post.tags },
  });
}

export default async function PostPage({ params }: PageProps<"/[lang]/blog/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const post = pickVersion(slug, locale);
  if (!post) notFound();

  const t = dict.blog;
  const lang = htmlLang[post.lang];
  const translation = getPostVersions(slug).find((v) => v.lang !== post.lang);
  // Newest first, so the previous (older) post comes after this one.
  const list = getPostList(locale);
  const index = list.findIndex((p) => p.slug === slug);
  const older = list[index + 1];
  const newer = index > 0 ? list[index - 1] : undefined;
  const all = { href: `/${locale}/blog`, label: t.allPosts, title: t.allPosts };

  return (
    <Page>
      <JsonLd data={postData(post, locale)} />
      <ReadingProgress />
      {/* One column; from the wide breakpoint the contents move to a sticky side column left of the text. */}
      <div className="grid text-read wide:grid-cols-[minmax(0,1fr)_minmax(0,var(--container-measure))_minmax(0,1fr)] wide:gap-x-16">
        <header className="mb-10 flex flex-col gap-5 border-b border-line pb-10 wide:col-span-2 wide:col-start-2">
          <Link href={`/${locale}/blog`} className="self-start font-mono text-xs tracking-widest text-muted uppercase hover:text-fg">
            <span aria-hidden="true">←</span> {t.allPosts}
          </Link>
          {post.lang !== locale && (
            <p className="self-start rounded-full bg-accent/15 px-3 py-1 text-sm">{t.onlyIn[post.lang]}</p>
          )}
          {post.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" lang={lang}>
              {post.tags.map((tag) => (
                <li key={tag} className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-fg">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <h1 lang={lang} className="type-post-title">
            {post.title}
          </h1>
          <p lang={lang} className="max-w-2xl text-lede text-pretty text-muted">
            {post.summary}
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs tracking-wider text-muted uppercase">
            <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
            <span>{t.minutes.replace("{n}", String(post.readingMinutes))}</span>
            <span>{localeNames[post.lang]}</span>
            {post.lang === locale && translation && (
              <Link href={`/${translation.lang}/blog/${slug}`} hrefLang={translation.lang} className="text-fg underline decoration-accent-text underline-offset-4">
                {t.readIn[translation.lang]}
              </Link>
            )}
          </p>
        </header>

        {post.toc.length > 1 && (
          <aside className="hidden wide:sticky wide:top-sticky wide:col-start-1 wide:row-start-2 wide:block wide:w-56 wide:self-start wide:justify-self-end">
            <Toc entries={post.toc} label={t.contents} variant="aside" />
          </aside>
        )}

        <div className="min-w-0 wide:col-start-2 wide:row-start-2">
          {post.toc.length > 1 && (
            <div className="wide:hidden">
              <Toc entries={post.toc} label={t.contents} variant="details" />
            </div>
          )}
          <article lang={lang} className="prose">
            <MDXContent code={post.body} components={components} />
          </article>

          {post.lang === locale && translation && (
            <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border border-fg px-5 py-4">
              <p className="text-base">{t.alsoIn[translation.lang]}</p>
              <Link
                href={`/${translation.lang}/blog/${slug}`}
                hrefLang={translation.lang}
                className="inline-flex items-center gap-2.5 rounded-full bg-fg px-5 py-2.5 font-mono text-xs font-medium tracking-wider text-bg uppercase transition-colors hover:bg-accent hover:text-accent-ink"
              >
                {t.readIn[translation.lang]}
                <span aria-hidden="true">→</span>
              </Link>
            </footer>
          )}
        </div>
      </div>

      <Pager
        label={t.title}
        prev={older ? { href: `/${locale}/blog/${older.slug}`, label: t.previous, title: older.title, lang: htmlLang[older.lang] } : all}
        next={newer ? { href: `/${locale}/blog/${newer.slug}`, label: t.next, title: newer.title, lang: htmlLang[newer.lang] } : all}
      />
    </Page>
  );
}
