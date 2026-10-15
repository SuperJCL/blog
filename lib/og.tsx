import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/config";
import { siteUrl } from "./site";

// Share images (Open Graph; X reads them too): 1200×630 PNGs on the dark stage of direction D. Each route's
// opengraph-image.tsx passes its words to `shareImage`. The file reads and font downloads are cached
// ('use cache'), as Cache Components requires of IO in a static route; none of them change between deploys.

export const shareSize = { width: 1200, height: 630 };
export const shareType = "image/png";

// Colors are the dark palette from app/globals.css, so the cards follow the design tokens.
async function stagePalette() {
  "use cache";
  cacheLife("max");
  const css = await readFile(join(process.cwd(), "app/globals.css"), "utf8");
  const token = (name: string) => {
    const value = new RegExp(`--dark-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
    if (!value) throw new Error(`--dark-${name} is missing from app/globals.css`);
    return value;
  };
  return { bg: token("bg"), fg: token("fg"), muted: token("muted"), line: token("line"), accent: token("accent") };
}

// A JPEG copy of public/portrait.webp: the renderer draws no WebP. Re-export it when the portrait changes.
async function portraitData() {
  "use cache";
  cacheLife("max");
  return `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "assets/share-portrait.jpg"))).toString("base64")}`;
}

// One weight of a Google font with only the given characters, as base64 (cached values must serialize).
// The CSS API serves TTF, which Satori reads, to clients that don't ask for WOFF2.
async function googleFont(family: string, weight: number, chars: string) {
  "use cache";
  cacheLife("max");
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(chars)}`;
  const css = await (await fetch(url)).text();
  const src = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
  if (!src) throw new Error(`Google Fonts returned no TTF for ${family} ${weight}`);
  return Buffer.from(await (await fetch(src)).arrayBuffer()).toString("base64");
}
// The subset includes capitals too: English text is drawn uppercased.
const font = async (family: string, weight: number, text: string) =>
  Buffer.from(await googleFont(family, weight, [...new Set(text + text.toUpperCase())].sort().join("")), "base64");

export type ShareCard = {
  locale: Locale; // the page's language: brand name, labels, casing
  titleLang?: Locale; // the title's language when it differs (a post shown in the other language)
  name: string;
  kicker: string;
  title: string | string[]; // an array is drawn one line each (a line too long still wraps)
  accentLast?: boolean; // the last line in the accent, as in the hero
  meta?: string;
  portrait?: boolean;
};

// Long titles step down so they stay within three lines.
function titleSize(text: string, zh: boolean, narrow: boolean) {
  const steps = zh ? [[8, 112], [16, 88], [28, 70]] : [[16, 132], [30, 104], [56, 80]];
  const size = steps.find(([max]) => text.length <= max)?.[1] ?? (zh ? 58 : 66);
  return Math.round(size * (narrow ? 0.82 : 1));
}

export async function shareImage(card: ShareCard) {
  const c = await stagePalette();
  const zhTitle = (card.titleLang ?? card.locale) === "zh";
  const zhUi = card.locale === "zh";
  const parts = typeof card.title === "string" ? [card.title] : card.title;
  const host = siteUrl.replace(/^https:\/\//, "");
  const everything = [card.name, card.kicker, ...parts, card.meta ?? "", host].join("");
  const portrait = card.portrait ? await portraitData() : null;
  const size = titleSize(parts.join(zhTitle ? "" : " "), zhTitle, !!portrait);
  const mono = { fontFamily: "Plex Mono, Noto Sans SC", fontWeight: 500, letterSpacing: zhUi ? 1 : 3, textTransform: zhUi ? "none" : "uppercase" } as const;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: c.bg, color: c.fg, position: "relative" }}>
        {/* The portrait sits right, fading into the stage toward the text, like the hero's mask. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img elements */}
        {portrait && <img src={portrait} width={827} height={630} style={{ position: "absolute", top: 0, right: -110 }} alt="" />}
        {portrait && <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, backgroundImage: `linear-gradient(to right, ${c.bg} 38%, transparent 64%)` }} />}
        {portrait && <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, backgroundImage: `linear-gradient(to top, ${c.bg} 4%, transparent 36%, transparent 80%, ${c.bg} 100%)` }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="22" fill={c.accent} />
            <path d="M22 11 L24.4 19.6 L33 22 L24.4 24.4 L22 33 L19.6 24.4 L11 22 L19.6 19.6 Z" fill={c.bg} />
          </svg>
          <span style={{ fontFamily: zhUi ? "Noto Sans SC" : "Anton", fontWeight: zhUi ? 900 : 400, fontSize: 34, textTransform: "uppercase", letterSpacing: zhUi ? 2 : 1 }}>{card.name}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26, maxWidth: portrait ? 660 : 1040 }}>
          <span style={{ ...mono, fontSize: 24, color: c.accent }}>{card.kicker}</span>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: zhTitle ? "Noto Sans SC" : "Anton", fontWeight: zhTitle ? 900 : 400, fontSize: size, lineHeight: zhTitle ? 1.16 : 0.96, textTransform: zhTitle ? "none" : "uppercase", letterSpacing: zhTitle ? 0 : 1 }}>
            {parts.map((part, i) => (
              <span key={part} style={{ color: card.accentLast && i === parts.length - 1 ? c.accent : c.fg }}>{part}</span>
            ))}
          </div>
          {card.meta && <span style={{ ...mono, fontSize: 22, color: c.muted, lineHeight: 1.5 }}>{card.meta}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 4, background: c.accent }} />
          <span style={{ fontFamily: "Plex Mono", fontWeight: 500, fontSize: 22, color: c.muted, letterSpacing: 2 }}>{host}</span>
        </div>
      </div>
    ),
    {
      ...shareSize,
      fonts: [
        { name: "Anton", data: await font("Anton", 400, everything), weight: 400 },
        { name: "Plex Mono", data: await font("IBM Plex Mono", 500, everything), weight: 500 },
        { name: "Noto Sans SC", data: await font("Noto Sans SC", 900, everything), weight: 900 },
        { name: "Noto Sans SC", data: await font("Noto Sans SC", 500, everything), weight: 500 },
      ],
    },
  );
}
