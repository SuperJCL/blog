import type { Metadata } from "next";
import { NumberedSection } from "@/components/numbered-section";
import { JsonLd } from "@/components/json-ld";
import { Page } from "@/components/page";
import { awards } from "@/data/awards";
import { experience } from "@/data/experience";
import { contact, profile } from "@/data/profile";
import { skills } from "@/data/skills";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatPeriod } from "@/lib/format";
import { pageMeta } from "@/lib/site";
import { personData } from "@/lib/structured-data";

// The description is the summary's first sentence and the current status.
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  const locale = await getLocale();
  const firstSentence = profile.summary[locale].match(/^.+?[.。]/)?.[0] ?? profile.role[locale];
  const description = `${firstSentence}${locale === "zh" ? "" : " "}${profile.status[locale]}${locale === "zh" ? "。" : "."}`;
  return pageMeta({ locale, path: "/about", site: dict.meta.title, title: dict.about.title, description });
}

// The date column fits "2026.09 – 2029.05（预计）" on one line.
const row = "grid gap-x-8 gap-y-1 py-4 md:grid-cols-[14rem_minmax(0,1fr)]";
const when = "font-mono text-sm text-muted tabular-nums";

export default async function AboutPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.about;
  const studying = experience.find((item) => item.period.expected);
  const facts = [
    { label: t.basedIn, value: profile.location[locale] },
    { label: t.status, value: profile.status[locale] },
    ...(studying?.place ? [{ label: t.studying, value: `${studying.place[locale]} · ${studying.title[locale]}`, wide: true }] : []),
  ];
  const links = [
    { label: dict.contact.email, href: `mailto:${contact.email}`, text: contact.email, external: false },
    ...contact.links.map((link) => ({ label: link.label, href: link.href, text: link.href.replace(/^https:\/\/(www\.)?/, ""), external: true })),
  ];

  return (
    <Page>
      <JsonLd data={personData(locale)} />
      <header className="flex flex-col gap-6 pb-12">
        <h1 className="type-display text-title">{t.title}</h1>
        <p className="max-w-measure text-lede text-pretty">{profile.summary[locale]}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-fg pt-4 md:grid-cols-[1fr_1fr_2fr]">
          {facts.map((fact) => (
            <div key={fact.label} className={`min-w-0 ${"wide" in fact && fact.wide ? "col-span-2 md:col-span-1" : ""}`}>
              <dt className="type-label text-muted">{fact.label}</dt>
              <dd className="mt-1.5 leading-normal">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <NumberedSection n="01" title={t.experience}>
        <ol className="divide-y divide-line">
          {experience.map((item) => (
            <li key={item.period.start} className={row}>
              <p className={when}>
                {formatPeriod(item.period.start, item.period.end, locale, dict.projects.present)}
                {item.period.expected && t.expected}
              </p>
              <div className="min-w-0">
                <p className="font-semibold">{item.place?.[locale] ?? item.title[locale]}</p>
                {item.place && <p className="text-muted">{item.title[locale]}</p>}
              </div>
            </li>
          ))}
        </ol>
      </NumberedSection>

      <NumberedSection n="02" title={t.awards}>
        <ul className="divide-y divide-line">
          {awards.map((award) => (
            <li key={award.title.en} className={row}>
              <p className={when}>{award.year}</p>
              <p className="min-w-0 text-pretty">{award.title[locale]}</p>
            </li>
          ))}
        </ul>
      </NumberedSection>

      <NumberedSection n="03" title={t.skills}>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {skills.map((group) => (
            <div key={group.label.en} className="flex flex-col gap-3">
              <h3 className="type-label text-muted">{group.label[locale]}</h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const text = typeof item === "string" ? item : item[locale];
                  return (
                    <li key={text} className="rounded-full border border-line px-3 py-1 text-sm">
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </NumberedSection>

      {/* The header's "contact" button links here. */}
      <NumberedSection n="04" title={t.contactTitle} id="contact">
        <div className="flex flex-col gap-6">
          <p className="flex items-center gap-2 text-muted">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-text" />
            {profile.status[locale]} · {profile.location[locale]}
          </p>
          <dl className="divide-y divide-line border-y border-line">
            {links.map((link) => (
              <div key={link.href} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3.5 md:grid-cols-[8rem_minmax(0,1fr)]">
                <dt className="text-sm text-muted">{link.label}</dt>
                <dd className="min-w-0 break-words">
                  <a
                    href={link.href}
                    className="hover:text-accent-text"
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.text}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-2.5 self-start rounded-full bg-accent px-5 py-2.5 font-mono text-xs font-medium tracking-wider text-accent-ink uppercase"
          >
            {t.emailMe}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </NumberedSection>
    </Page>
  );
}
