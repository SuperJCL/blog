import type { Metadata } from "next";
import { ContactScreen, HeroScreen, PostsScreen, SkillsScreen, WorkScreen } from "@/components/home/screens";
import { SlidePager } from "@/components/home/slide-pager";
import { JsonLd } from "@/components/json-ld";
import { seattleDemo } from "@/data/lab";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPostList } from "@/lib/posts";
import { getProjects } from "@/lib/projects";
import { pageMeta } from "@/lib/site";
import { personData } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = await getDictionary();
  return pageMeta({ locale, path: "", site: dict.meta.title, title: dict.meta.homeTitle, home: true, description: dict.meta.description });
}

export default async function Home() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const works = getProjects(locale).filter((project) => project.featured);
  const posts = getPostList(locale).slice(0, 3);
  const label = dict.home.screen;
  const slides = [
    { id: "hero", label: label.hero },
    { id: "skills", label: label.skills },
    ...works.map((_, i) => ({ id: `work-${i + 1}`, label: `${label.work} ${i + 1}` })),
    { id: "posts", label: label.posts },
    { id: "contact", label: label.contact },
  ];

  return (
    <>
      <JsonLd data={personData(locale)} />
      <SlidePager slides={slides} dotsLabel={dict.home.screens}>
        <HeroScreen dict={dict} locale={locale} />
        <SkillsScreen dict={dict} locale={locale} />
        {works.map((project, i) => (
          <WorkScreen
            key={project.slug}
            dict={dict}
            locale={locale}
            project={project}
            index={i}
            total={works.length}
            demo={project.slug === seattleDemo.relatedProject ? { href: `/${locale}/lab/${seattleDemo.slug}`, label: dict.home.tryDemo } : undefined}
          />
        ))}
        <PostsScreen dict={dict} locale={locale} posts={posts} />
        <ContactScreen dict={dict} locale={locale} />
      </SlidePager>
    </>
  );
}
