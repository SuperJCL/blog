import { allProjects } from "content-collections";
import type { Locale } from "@/i18n/config";

export type Project = (typeof allProjects)[number];

// Every project exists in both languages (checked when content is built).
export function getProjectSlugs(): string[] {
  return [...new Set(allProjects.map((project) => project.slug))];
}

export function getProject(slug: string, locale: Locale): Project | undefined {
  return allProjects.find((project) => project.slug === slug && project.lang === locale);
}

export function getProjects(locale: Locale): Project[] {
  return allProjects.filter((project) => project.lang === locale).sort((a, b) => a.order - b.order);
}
