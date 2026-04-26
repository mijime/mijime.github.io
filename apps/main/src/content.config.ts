import { defineCollection } from "astro:content"
import { z } from "zod"
import { glob } from "astro/loaders"

const blog = defineCollection({
  loader: glob({ base: "../../packages/blog/contents", pattern: "**/*.md" }),
  schema: z.object({
    Title: z.string(),
    Description: z.string().optional(),
    Tags: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((v) => {
        if (!v) return undefined
        if (Array.isArray(v)) return v
        return v
          .replaceAll(/[[\]'"]/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      }),
    IsDraft: z.boolean().optional().default(false),
    CreatedAt: z.string().optional(),
    UpdatedAt: z.string().optional(),
  }),
})

export const collections = { blog }
