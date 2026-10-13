import type { Metadata } from "next";
import { Page } from "@/components/page";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.about.title };
}

export default async function AboutPage() {
  const dict = await getDictionary();
  return (
    <Page>
      <h1>{dict.about.title}</h1>
      <p>{dict.about.intro}</p>
      <section id="contact">
        <h2>{dict.about.contactTitle}</h2>
      </section>
    </Page>
  );
}
