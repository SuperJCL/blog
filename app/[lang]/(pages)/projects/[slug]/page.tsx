import { MDXContent } from "@content-collections/mdx/react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, Figure, Flow, Stat, Stats, Step } from "@/components/mdx/media";
import { Approach, Problem, Result, Role } from "@/components/case/sections";
import { Page } from "@/components/page";
import { Pager } from "@/components/pager";
import { SceneCanvas } from "@/components/scene-canvas";
import { htmlLang, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatPeriod } from "@/lib/format";
import { getProject, getProjects, getProjectSlugs } from "@/lib/projects";
import { seedFor } from "@/lib/scene";

// Tags a project MDX file can use.
const components = { Problem, Role, Approach, Result, Flow, Step, Arrow, Figure, Stats, Stat };

const pad = (n: number) => String(n).padStart(2, "0");

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const project = getProject(slug, locale);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: `/${locale}/projects/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [htmlLang[l], `/${l}/projects/${slug}`])),
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const project = getProject(slug, locale);
  if (!project) notFound();

  const t = dict.projects;
  const featured = getProjects(locale).filter((p) => p.featured);
  const index = featured.findIndex((p) => p.slug === slug);
  const prev = index > 0 ? featured[index - 1] : undefined;
  const next = index >= 0 && index < featured.length - 1 ? featured[index + 1] : undefined;
  const facts = [
    { label: t.period, value: formatPeriod(project.start, project.end, locale, t.present) },
    { label: t.role, value: project.role },
    { label: t.company, value: project.company },
    { label: t.stack, value: project.stack.join(" · "), wide: true },
  ];
  const caption = project.cover?.caption ?? (project.confidential ? t.diagramCaption : undefined);

  return (
    <Page>
      <header className="flex flex-col gap-6 pb-12">
        <Link href={`/${locale}/projects`} className="self-start font-mono text-xs tracking-widest text-muted uppercase hover:text-fg">
          ← {t.all}
        </Link>
        {index >= 0 && (
          <p className="flex gap-3 type-kicker text-muted">
            {t.title}
            <span className="text-accent-text tabular-nums">
              {pad(index + 1)} / {pad(featured.length)}
            </span>
          </p>
        )}
        <h1 className="max-w-[11em] type-display text-title">{project.title}</h1>
        <p className="max-w-2xl text-lede text-pretty text-muted">{project.summary}</p>
        {project.confidential && (
          <p className="self-start rounded-full bg-accent/15 px-3 py-1 text-sm">{t.confidential}</p>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-fg pt-4 md:grid-cols-[1fr_1fr_1fr_2fr]">
          {facts.map((fact) => (
            <div key={fact.label} className={`min-w-0 ${fact.wide ? "col-span-2 md:col-span-1" : ""}`}>
              <dt className="type-label text-muted">{fact.label}</dt>
              <dd className="mt-1.5 leading-normal">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <figure className="mb-16 flex flex-col gap-3">
        <div className="relative aspect-video max-w-full overflow-hidden border border-line bg-surface">
          {project.cover ? (
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              sizes="(min-width: 1440px) 1176px, 92vw"
              className="object-cover"
            />
          ) : (
            <SceneCanvas scene={project.confidential ? "diagram" : "terrain"} seed={seedFor(project.slug)} />
          )}
          {project.confidential && (
            <span className="absolute top-4 left-4 border border-line bg-bg px-2.5 py-2 type-label text-fg">{t.diagramTag}</span>
          )}
        </div>
        {caption && <figcaption className="font-mono text-xs leading-relaxed text-pretty text-muted">{caption}</figcaption>}
      </figure>

      {/* Problem, role, approach, result: each section brings its own label and prose styles. */}
      <MDXContent code={project.body} components={components} />

      <Pager
        label={t.title}
        prev={prev ? { href: `/${locale}/projects/${prev.slug}`, label: t.previous, title: prev.title } : { href: `/${locale}/projects`, label: t.all, title: t.all }}
        next={next ? { href: `/${locale}/projects/${next.slug}`, label: t.next, title: next.title } : { href: `/${locale}/projects`, label: t.all, title: t.all }}
      />
    </Page>
  );
}
