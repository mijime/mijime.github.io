import { join } from "node:path";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { blogIntegration } from "@mijime/blog/integration";
import { generateBlogParquet } from "@mijime/blog/parquet";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    react(),
    mdx(),
    blogIntegration({ globalCss: "/src/styles/global.css" }),
    {
      name: "blog-parquet",
      hooks: {
        "astro:build:start": async () => {
          await generateBlogParquet(join(process.cwd(), "public"));
        },
      },
    },
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["react-dom/client"],
    },
  },
  output: "static",
});
