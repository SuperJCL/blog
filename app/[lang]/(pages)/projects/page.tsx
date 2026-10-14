import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoopVideo } from "@/components/loop-video";
import { Page } from "@/components/page";
import { SceneCanvas } from "@/components/scene-canvas";
import { otherProjects, type ProjectMedia } from "@/data/other-projects";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatPeriod } from "@/lib/format";
import { getProjects } from "@/lib/projects";
import { seedFor } from "@/lib/scene";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.projects.title, description: dict.projects.intro };
}

const pad = (n: number) => String(n).padStart(2, "0");

// Media side by side share one 16:9 frame, so their edges line up whatever the file's own ratio.
function Media({ item, locale }: { item: ProjectMedia; locale: Locale }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2.5">
      <div className="relative aspect-video overflow-hidden border border-line bg-surface">
        {item.kind === "video" ? (
          <LoopVideo
            src={item.src}
            poster={item.poster}
            width={item.width}
            height={item.height}
            label={item.alt[locale]}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Image
            src={item.src}
            alt={item.alt[locale]}
            fill
            sizes="(min-width: 1320px) 520px, (min-width: 768px) 38vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <figcaption className="font-mono text-xs leading-relaxed text-pretty text-muted">{item.caption[locale]}</figcaption>
    </figure>
  );
}

export default async function ProjectsPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.projects;
  const featured = getProjects(locale).filter((project) => project.featured);

  return (
    <Page>
      <header className="flex flex-col gap-5 pb-14">
        <h1 className="type-display text-title">{t.title}</h1>
        <p className="max-w-2xl text-lede text-pretty text-muted">{t.intro}</p>
      </header>

      <section aria-labelledby="cases-title">
        <h2 id="cases-title" className="pb-4 type-kicker text-muted">
          {t.casesTitle}
        </h2>
        <ol className="border-b border-line">
          {featured.map((project, i) => (
            <li key={project.slug} className="border-t border-line">
              <Link
                href={`/${locale}/projects/${project.slug}`}
                className="group grid gap-6 py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-12"
              >
                <div className="relative aspect-video overflow-hidden border border-line bg-surface">
                  {project.cover ? (
                    <Image
                      src={project.cover.src}
                      alt=""
                      fill
                      sizes="(min-width: 1320px) 490px, (min-width: 768px) 40vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-reveal group-hover:scale-[1.02]"
                    />
                  ) : (
                    <SceneCanvas scene={project.confidential ? "diagram" : "terrain"} seed={seedFor(project.slug)} />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <p className="type-kicker text-accent-text tabular-nums">{pad(i + 1)}</p>
                  <h3 className="type-display text-h2 transition-colors group-hover:text-accent-text">{project.title}</h3>
                  <p className="max-w-measure text-pretty text-muted">{project.summary}</p>
                  <p className="type-label text-muted">
                    {formatPeriod(project.start, project.end, locale, t.present)} · {project.role}
                  </p>
                  {project.confidential && (
                    <p className="self-start rounded-full bg-accent/15 px-3 py-1 text-sm">{t.confidential}</p>
                  )}
                  <span className="self-start border-b border-current pb-px font-semibold text-accent-text">
                    {dict.home.viewCase} →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="other-title" className="pt-20">
        <h2 id="other-title" className="type-display text-h2">
          {t.otherTitle}
        </h2>
        <ul className="mt-8 border-b border-line">
          {otherProjects.map((note) => (
            <li key={note.title.en} className="grid gap-x-8 gap-y-2 border-t border-line py-6 md:grid-cols-[10rem_minmax(0,1fr)]">
              <p className="font-mono text-sm text-muted tabular-nums">
                {formatPeriod(note.period.start, note.period.end, locale, t.present)}
              </p>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-lg font-semibold">{note.title[locale]}</h3>
                <p className="max-w-measure text-pretty text-muted">{note.summary[locale]}</p>
                {note.media && (
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    {note.media.map((item) => (
                      <Media key={item.src} item={item} locale={locale} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
