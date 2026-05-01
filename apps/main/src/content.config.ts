import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { blogSchema } from "@mijime/blog"

const blog = defineCollection({
  loader: glob({
    base: "../../packages/blog-contents/contents",
    pattern: "**/*.md",
  }),
  schema: blogSchema,
})

export const collections = { blog }
