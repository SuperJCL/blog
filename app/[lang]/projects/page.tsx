import type { Metadata } from "next";
import { Page } from "@/components/page";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.projects.title };
}

export default async function ProjectsPage() {
  const dict = await getDictionary();
  return (
    <Page>
      <h1>{dict.projects.title}</h1>
      <p>{dict.projects.intro}</p>
    </Page>
  );
}
