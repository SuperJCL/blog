import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";
import { hasLocale } from "./i18n/config";

// Files are named `<slug>.<lang>.mdx`. Files that share a slug are translations of each other.
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
    const [slug, lang, ...rest] = document._meta.path.split(".");
    if (!slug || !lang || rest.length > 0 || !hasLocale(lang)) {
      throw new Error(
        `Post file name must be <slug>.<lang>.mdx with lang en or zh: ${document._meta.filePath}`,
      );
    }
    const body = await compileMDX(context, document);
    return { ...document, slug, lang, body };
  },
});

export default defineConfig({
  content: [posts],
});
