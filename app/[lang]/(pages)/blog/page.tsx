import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page";
import { htmlLang, localeNames } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPostList } from "@/lib/posts";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.blog.title, description: dict.blog.intro };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = getPostList(locale);

  return (
    <Page>
      <header className="flex flex-col gap-5 pb-14">
        <h1 className="type-display text-title">{dict.blog.title}</h1>
        <p className="max-w-2xl text-lede text-pretty text-muted">{dict.blog.intro}</p>
      </header>
      {posts.length === 0 ? (
        <p className="text-muted">{dict.blog.empty}</p>
      ) : (
        <ol className="border-b border-line">
          {posts.map((post) => (
            <li key={post.slug} className="border-t border-line">
              <Link
                href={`/${locale}/blog/${post.slug}`}
                className="group grid gap-x-8 gap-y-2 py-7 md:grid-cols-[8rem_minmax(0,1fr)_6rem] md:items-baseline"
              >
                <time dateTime={post.date} className="font-mono text-sm text-muted tabular-nums">
                  {post.date}
                </time>
                <div lang={htmlLang[post.lang]} className="flex min-w-0 flex-col gap-2.5">
                  <h2 className="text-xl leading-snug font-semibold text-balance transition-colors group-hover:text-accent-text">
                    {post.title}
                  </h2>
                  <p className="max-w-measure text-pretty text-muted">{post.summary}</p>
                  {post.tags.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <li key={tag} className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-fg">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Each post names its own language; a post not in the page's language is marked in the accent. */}
                <span
                  className={`font-mono text-xs tracking-wider md:text-right ${post.lang === locale ? "text-muted" : "text-accent-text"}`}
                >
                  {localeNames[post.lang]}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}
