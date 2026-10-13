import { MDXContent } from "@content-collections/mdx/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/page";
import { htmlLang } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/format";
import { getPostSlugs, getPostVersions, pickVersion } from "@/lib/posts";

// Every slug exists in both UI languages. When the post has no version in the
// page's language, the existing version is shown with a notice instead.
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = pickVersion(slug, await getLocale());
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    alternates: {
      // On the fallback page this points search engines at the post's own URL.
      canonical: `/${post.lang}/blog/${slug}`,
      languages: Object.fromEntries(
        getPostVersions(slug).map((v) => [htmlLang[v.lang], `/${v.lang}/blog/${slug}`]),
      ),
    },
  };
}

export default async function PostPage({ params }: PageProps<"/[lang]/blog/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const post = pickVersion(slug, locale);
  if (!post) notFound();

  const translation = getPostVersions(slug).find((v) => v.lang !== post.lang);

  return (
    <Page>
      {post.lang !== locale && <p>{dict.blog.onlyIn[post.lang]}</p>}
      <article lang={htmlLang[post.lang]}>
        <header>
          <h1>{post.title}</h1>
          <p>
            <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
          </p>
        </header>
        <MDXContent code={post.body} />
      </article>
      <nav>
        {post.lang === locale && translation && (
          <p>
            <Link href={`/${translation.lang}/blog/${slug}`} hrefLang={translation.lang}>
              {dict.blog.readIn[translation.lang]}
            </Link>
          </p>
        )}
        <p>
          <Link href={`/${locale}/blog`}>{dict.blog.allPosts}</Link>
        </p>
      </nav>
    </Page>
  );
}
