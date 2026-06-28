import path from "node:path";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { blogIntegration } from "@mijime/blog/integration";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  server: { host: "0.0.0.0" },
  integrations: [
    react(),
    mdx(),
    blogIntegration({
      globalCss: "/src/styles/global.css",
      siteUrl: "https://mijime.github.io",
      siteName: "mijime",
      contentsDir: path.join(process.cwd(), "../../packages/blog-contents/contents"),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["lucide-react", "react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react-dom/client"],
    },
  },
  output: "static",
});
