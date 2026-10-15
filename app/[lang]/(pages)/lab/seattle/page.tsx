import type { Metadata } from "next";
import { CityViewer } from "@/components/lab/city-viewer";
import { NumberedSection } from "@/components/numbered-section";
import { Page } from "@/components/page";
import { seattleDemo } from "@/data/lab";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { pageMeta } from "@/lib/site";
import city from "@/public/lab/seattle/city.json";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = await getDictionary();
  return pageMeta({
    locale,
    path: `/lab/${seattleDemo.slug}`,
    site: dict.meta.title,
    title: seattleDemo.title[locale],
    description: seattleDemo.description[locale],
  });
}

const BYTES = { Uint8: 1, Uint16: 2, Int16: 2 } as const;

export default async function SeattleDemoPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.lab;
  // Figures in the text come from the data, so they stay right when it's rebuilt.
  const number = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US");
  const [tagged, storeys, typed] = city.heightSourceCounts;
  const bytes = Math.max(...Object.values(city.sections).map((s) => s.offset + s.length * BYTES[s.type as keyof typeof BYTES]));
  const values: Record<string, string> = {
    buildings: number.format(city.counts.buildings),
    tallest: String(city.tallest),
    tagged: number.format(tagged),
    storeys: number.format(storeys),
    typed: number.format(typed),
    size: String(Math.round(bytes / 1024)),
  };
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? key);

  return (
    <Page>
      <header className="flex flex-col gap-5 pb-10">
        <p className="type-kicker text-accent-text">{t.kicker}</p>
        <h1 className="type-display text-title">{seattleDemo.title[locale]}</h1>
        <p className="max-w-measure text-lede text-pretty text-muted">{fill(seattleDemo.lede[locale])}</p>
      </header>

      <CityViewer
        data={seattleDemo.data}
        zh={locale === "zh"}
        places={seattleDemo.landmarks.map((l) => ({ id: l.id, name: l.name[locale], lat: l.lat, lon: l.lon }))}
        labels={{ ...t, viewer: fill(t.viewerLabel) }}
      />

      <div className="mt-section">
        {seattleDemo.sections.map((section, i) => (
          <NumberedSection key={section.title.en} n={String(i + 1).padStart(2, "0")} title={section.title[locale]} prose>
            {section.paragraphs?.map((p) => <p key={p.en}>{fill(p[locale])}</p>)}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item.en}>{fill(item[locale])}</li>
                ))}
              </ul>
            )}
            {section.links && (
              <ul>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label[locale]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </NumberedSection>
        ))}
      </div>
    </Page>
  );
}
