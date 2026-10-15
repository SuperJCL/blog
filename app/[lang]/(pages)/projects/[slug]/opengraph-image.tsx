import { notFound } from "next/navigation";
import { profile } from "@/data/profile";
import { hasLocale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/get-dictionary";
import { formatPeriod } from "@/lib/format";
import { shareImage, shareSize, shareType } from "@/lib/og";
import { getProject } from "@/lib/projects";

// A case study's card: title, dates, role and company. Text only, as confidential work allows no screenshots.
export async function generateImageMetadata({ params }: { params: { lang: string; slug: string } }) {
  const project = hasLocale(params.lang) ? getProject(params.slug, params.lang) : undefined;
  return project ? [{ id: "card", alt: project.title, size: shareSize, contentType: shareType }] : [];
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const project = hasLocale(lang) ? getProject(slug, lang) : undefined;
  if (!hasLocale(lang) || !project) notFound();
  const dict = await dictionaryFor(lang);
  return shareImage({
    locale: lang,
    name: profile.name[lang],
    kicker: `${dict.nav.projects} · ${formatPeriod(project.start, project.end, lang, dict.projects.present)}`,
    title: project.title,
    meta: `${project.role} · ${project.company}`,
  });
}
