// A post's table of contents, read from its MDX source when content is built. The rendered headings get the
// same ids in the same order (lib/rehype-heading-ids.ts), so the two always match.

export type TocEntry = { depth: 2 | 3; text: string; id: string };

// Keeps letters and digits of any script, so Chinese headings get readable ids too.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// Repeated headings get -2, -3…
function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };
}

// A heading's text as it renders: inline code, links and emphasis reduced to their words.
function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])\*(.+?)\*(?!\w)/g, "$1$2")
    .trim();
}

// The h2 and h3 of an MDX body, skipping fenced code.
export function extractToc(markdown: string): TocEntry[] {
  const slug = createSlugger();
  const toc: TocEntry[] = [];
  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const text = plainText(heading[2]);
    toc.push({ depth: heading[1].length as 2 | 3, text, id: slug(text) });
  }
  return toc;
}
