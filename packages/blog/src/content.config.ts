import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema } from "./schema";

const contentsDir =
  (import.meta.env.BLOG_CONTENTS_DIR as string | undefined) ??
  "../../packages/blog-contents/contents";
const blog = defineCollection({
  loader: glob({ base: contentsDir, pattern: "**/*.md" }),
  schema: blogSchema,
});

export const collections = { blog };
