import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";
import { hasLocale, locales } from "./i18n/config";
import { extractToc } from "./lib/headings";
import { readingMinutes } from "./lib/reading-time";
import { rehypeHeadingIds } from "./lib/rehype-heading-ids";

// Files are named `<slug>.<lang>.mdx`. Files that share a slug are translations of each other.
function splitPath(meta: { path: string; filePath: string }, kind: string) {
  const [slug, lang, ...rest] = meta.path.split(".");
  if (!slug || !lang || rest.length > 0 || !hasLocale(lang)) {
    throw new Error(`${kind} file name must be <slug>.<lang>.mdx with lang en or zh: ${meta.filePath}`);
  }
  return { slug, lang };
}

const posts = defineCollection({
  name: "posts",
  directory: "content/posts",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.iso.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    content: z.string(),
  }),
  transform: async (document, context) => {
    const { slug, lang } = splitPath(document._meta, "Post");
    const toc = extractToc(document.content);
    const body = await compileMDX(context, document, {
      rehypePlugins: [[rehypeHeadingIds, { ids: toc.map((entry) => entry.id) }]],
    });
    return { ...document, slug, lang, body, toc, readingMinutes: readingMinutes(document.content) };
  },
});

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, "use YYYY-MM");

// The body is exactly the four case-study sections, in this order (CLAUDE.md, 设计).
const caseSections = /^\s*<Problem>[\s\S]*?<\/Problem>\s*<Role>[\s\S]*?<\/Role>\s*<Approach>[\s\S]*?<\/Approach>\s*<Result>[\s\S]*?<\/Result>\s*$/;

const projects = defineCollection({
  name: "projects",
  directory: "content/projects",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    start: yearMonth,
    end: yearMonth.optional(), // omitted while ongoing
    role: z.string(),
    company: z.string(),
    stack: z.array(z.string()).min(1),
    // Public-safety work: no screenshots and no real data, only an abstract diagram (CLAUDE.md, 内容规则).
    confidential: z.boolean().default(false),
    // A screenshot under public/, shown 16:9 (cropped to fit). Without one the page draws a generated terrain.
    cover: z
      .object({ src: z.string().startsWith("/"), alt: z.string(), caption: z.string().optional() })
      .optional(),
    featured: z.boolean().default(false),
    order: z.number().int(),
    content: z.string(),
  }),
  transform: async (document, context) => {
    const { slug, lang } = splitPath(document._meta, "Project");
    const file = document._meta.filePath;
    if (document.confidential && document.cover) {
      throw new Error(`A confidential project can't have a screenshot cover: ${file}`);
    }
    if (!caseSections.test(document.content)) {
      throw new Error(`Project body must be <Problem>, <Role>, <Approach>, <Result>, in that order: ${file}`);
    }
    // Unlike posts, every project is published in both languages.
    const versions = (await context.collection.documents()).map((d) => d._meta.path.split("."));
    const missing = locales.filter((l) => !versions.some(([s, v]) => s === slug && v === l));
    if (missing.length > 0) {
      throw new Error(`Project "${slug}" is missing its ${missing.join(", ")} version: ${file}`);
    }
    const body = await compileMDX(context, document);
    return { ...document, slug, lang, body };
  },
});

export default defineConfig({
  content: [posts, projects],
});
