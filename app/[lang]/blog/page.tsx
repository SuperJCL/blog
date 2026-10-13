import type { Metadata } from "next";
import Link from "next/link";
import { htmlLang, localeNames } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/format";
import { getPostList } from "@/lib/posts";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.blog.title };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = getPostList(locale);

  return (
    <main>
      <h1>{dict.blog.title}</h1>
      {posts.length === 0 ? (
        <p>{dict.blog.empty}</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/${locale}/blog/${post.slug}`} lang={htmlLang[post.lang]}>
                {post.title}
              </Link>
              <p>
                <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
                {/* Mark posts that aren't in the page's language. */}
                {post.lang !== locale && <span> · {localeNames[post.lang]}</span>}
              </p>
              <p lang={htmlLang[post.lang]}>{post.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
