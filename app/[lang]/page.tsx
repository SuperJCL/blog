import { Page } from "@/components/page";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function Home() {
  const dict = await getDictionary();
  return (
    <Page>
      <h1>{dict.home.title}</h1>
      <p>{dict.home.intro}</p>
    </Page>
  );
}
