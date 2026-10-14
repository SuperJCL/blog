import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { SceneCanvas } from "@/components/scene-canvas";
import { aboutCard, focusAreas, hero, marquee } from "@/data/home";
import { contact, profile, siteSince } from "@/data/profile";
import { htmlLang, localeNames, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatPeriod } from "@/lib/format";
import type { Post } from "@/lib/posts";
import type { Project } from "@/lib/projects";
import { seedFor } from "@/lib/scene";

type ScreenProps = { dict: Dictionary; locale: Locale };

// Every homepage screen fills the viewport and snaps. The pager sets --ty/--o (text) and --vy (visuals) per frame.
const screen = "relative flex min-h-full snap-start snap-always flex-col overflow-hidden px-gutter pt-slide-top pb-slide-bottom";
const moving = "translate-y-(--ty) opacity-(--o) will-change-transform";
const textLink = "self-start border-b border-current pb-px font-semibold text-accent-text hover:border-b-2";

// The corner cards: the three focus areas, then "about me" in the bottom-right corner.
export function HeroScreen({ dict, locale }: ScreenProps) {
  const cards = [
    ...focusAreas.map((area) => ({ title: area.title[locale], body: area.body[locale], meta: area.tools.join(" · ") })),
    { title: aboutCard.title[locale], body: aboutCard.body[locale], meta: aboutCard.tags.join(" · ") },
  ];
  return (
    <Hero
      title={hero.title[locale]}
      roles={hero.roles[locale]}
      cta={dict.home.heroCta}
      ctaHref="#work-1"
      cards={cards}
      cardsLabel={dict.home.cardsLabel}
      marquee={marquee}
      status={profile.status[locale]}
    />
  );
}

export function SkillsScreen({ dict, locale }: ScreenProps) {
  return (
    <section id="skills" aria-labelledby="skills-title" className={`${screen} justify-center`}>
      <div className={`flex w-full max-w-page flex-col gap-5 ${moving}`}>
        <p className="type-kicker text-muted">{dict.home.skillsKicker}</p>
        <h2 id="skills-title" className="type-display text-h2">
          {dict.home.skillsTitle}
        </h2>
        <ul className="mt-3 grid gap-6 md:grid-cols-3 md:gap-10">
          {focusAreas.map((area) => (
            <li key={area.id} className="flex flex-col gap-2 border-t border-line pt-5">
              <span className="font-mono text-label font-medium text-accent-text uppercase">{area.tag}</span>
              <h3 className="type-display text-2xl">{area.title[locale]}</h3>
              <p className="text-pretty text-muted">{area.body[locale]}</p>
              <p className="type-label text-muted">{area.tools.join(" · ")}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type WorkProps = ScreenProps & { project: Project; index: number; total: number };

export function WorkScreen({ dict, locale, project, index, total }: WorkProps) {
  const id = `work-${index + 1}`;
  const meta = [
    { label: dict.projects.role, value: project.role },
    { label: dict.projects.stack, value: project.stack.join(" · ") },
    { label: dict.projects.period, value: formatPeriod(project.start, project.end, locale, dict.projects.present) },
  ];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${screen} justify-end`}>
      {/* No screenshots yet: a generated terrain, or an abstract diagram for confidential work. */}
      <div className="absolute inset-0 translate-y-(--vy) will-change-transform">
        <SceneCanvas scene={project.confidential ? "diagram" : "terrain"} seed={seedFor(project.slug)} room />
      </div>
      <div className="pointer-events-none absolute inset-0 scrim-slide" />
      <div className={`relative grid w-full max-w-page gap-x-16 gap-y-5 md:grid-cols-[3fr_2fr] md:items-end ${moving}`}>
        <p className="flex gap-3 type-kicker text-muted md:col-span-2">
          {dict.home.featured}
          <span className="text-accent-text tabular-nums">
            {index + 1} / {total}
          </span>
        </p>
        <h2 id={`${id}-title`} className="type-display text-title">
          {project.title}
        </h2>
        <div className="flex max-w-xl flex-col gap-4">
          {project.confidential && (
            <p className="self-start rounded-full bg-accent/15 px-3 py-1 text-sm">{dict.projects.confidential}</p>
          )}
          <p className="text-pretty text-muted">{project.summary}</p>
          <dl className="flex flex-wrap gap-x-7 gap-y-2.5">
            {meta.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="type-label text-muted">{item.label}</dt>
                <dd className="text-sm">{item.value}</dd>
              </div>
            ))}
          </dl>
          <Link href={`/${locale}/projects/${project.slug}`} className={textLink}>
            {dict.home.viewCase} →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PostsScreen({ dict, locale, posts }: ScreenProps & { posts: Post[] }) {
  return (
    <section id="posts" aria-labelledby="posts-title" className={`${screen} justify-center`}>
      <div className={`flex w-full max-w-page flex-col gap-5 ${moving}`}>
        <p className="type-kicker text-muted">{dict.nav.blog}</p>
        <h2 id="posts-title" className="type-display text-h2">
          {dict.home.postsTitle}
        </h2>
        {posts.length === 0 ? (
          <p className="text-muted">{dict.blog.empty}</p>
        ) : (
          <ul className="mt-3 border-b border-line">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/${locale}/blog/${post.slug}`}
                  lang={htmlLang[post.lang]}
                  className="group grid grid-cols-[auto_auto] items-baseline justify-start gap-x-4 gap-y-1 border-t border-line py-4 md:grid-cols-[7rem_5rem_1fr]"
                >
                  <time dateTime={post.date} className="font-mono text-sm text-muted tabular-nums">
                    {post.date}
                  </time>
                  <span className="text-xs tracking-wider text-muted">{localeNames[post.lang]}</span>
                  <span className="col-span-2 text-lg font-medium text-pretty group-hover:text-accent-text md:col-span-1">
                    {post.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/${locale}/blog`} className={textLink}>
          {dict.blog.allPosts} →
        </Link>
      </div>
    </section>
  );
}

// The last screen doubles as the homepage footer.
export function ContactScreen({ dict, locale }: ScreenProps) {
  const rows = [
    { label: dict.contact.email, href: `mailto:${contact.email}`, text: contact.email, external: false },
    ...contact.links.map((link) => ({
      label: link.label,
      href: link.href,
      text: link.href.replace(/^https:\/\/(www\.)?/, ""),
      external: true,
    })),
  ];
  return (
    <section id="contact" aria-labelledby="contact-title" className={`${screen} justify-center`}>
      <div className={`flex w-full max-w-page flex-col gap-6 ${moving}`}>
        <p className="type-kicker text-muted">{dict.home.contactKicker}</p>
        <h2 id="contact-title" className="type-display text-title">
          {dict.home.contactTitle}
        </h2>
        <p className="flex items-center gap-2 text-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-text" />
          {profile.status[locale]} · {profile.location[locale]}
        </p>
        <dl className="border-b border-line">
          {rows.map((row) => (
            <div key={row.href} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-t border-line py-3.5 md:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="min-w-0 break-words">
                <a
                  href={row.href}
                  className="hover:text-accent-text"
                  {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {row.text}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <Link href={`/${locale}/about`} className={textLink}>
            {dict.home.aboutMore} →
          </Link>
          <p>
            © {siteSince} {profile.name[locale]}
          </p>
        </div>
      </div>
    </section>
  );
}
