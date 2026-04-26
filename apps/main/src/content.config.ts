import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "../../packages/blog/contents", pattern: "**/*.md" }),
  schema: z.object({
    Title: z.string(),
    Description: z.string().optional(),
    Tags: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        if (Array.isArray(v)) return v;
        return v
          .replace(/[[\]'"]/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }),
    Draft: z.boolean().optional().default(false),
    Date: z.string().optional(),
  }),
});

export const collections = { blog };
