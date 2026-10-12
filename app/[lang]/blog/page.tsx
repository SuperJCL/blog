import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.blog.title };
}

export default async function BlogPage() {
  const dict = await getDictionary();
  return (
    <main>
      <h1>{dict.blog.title}</h1>
      <p>{dict.blog.intro}</p>
    </main>
  );
}
