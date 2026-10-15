import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";

// The raw palette from app/globals.css (--light-* / --dark-*), for places CSS variables can't reach: share
// images and the browser's theme-color. Read once and cached, so the colors stay defined in one place.
export async function palette(mode: "light" | "dark") {
  "use cache";
  cacheLife("max");
  const css = await readFile(join(process.cwd(), "app/globals.css"), "utf8");
  const token = (name: string) => {
    const value = new RegExp(`--${mode}-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
    if (!value) throw new Error(`--${mode}-${name} is missing from app/globals.css`);
    return value;
  };
  return { bg: token("bg"), fg: token("fg"), muted: token("muted"), line: token("line"), accent: token("accent") };
}
