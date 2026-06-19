import type { AstroIntegration } from "astro";
import path from "node:path";

const pagesDir = path.join(import.meta.dirname, "astro/pages");

export function blogIntegration(options?: {
  globalCss?: string;
  siteUrl?: string;
  siteName?: string;
  contentsDir?: string;
}): AstroIntegration {
  return {
    name: "@mijime/blog",
    hooks: {
      "astro:config:setup": ({ injectRoute, injectScript, updateConfig }) => {
        updateConfig({
          vite: {
            define: {
              ...(options?.siteUrl && {
                "import.meta.env.BLOG_SITE_URL": JSON.stringify(options.siteUrl),
              }),
              ...(options?.siteName && {
                "import.meta.env.BLOG_SITE_NAME": JSON.stringify(options.siteName),
              }),
              ...(options?.contentsDir && {
                "import.meta.env.BLOG_CONTENTS_DIR": JSON.stringify(options.contentsDir),
              }),
            },
          },
        });
        if (options?.globalCss) {
          injectScript("page-ssr", `import ${JSON.stringify(options.globalCss)}`);
        }
        injectRoute({ pattern: "/blog/", entrypoint: path.join(pagesDir, "blog/index.astro") });
        injectRoute({
          pattern: "/blog/pages/[page]",
          entrypoint: path.join(pagesDir, "blog/pages/[page].astro"),
        });
        injectRoute({
          pattern: "/blog/[category]/[ym]/[slug]",
          entrypoint: path.join(pagesDir, "blog/[category]/[ym]/[slug].astro"),
        });
        injectRoute({
          pattern: "/blog/tags",
          entrypoint: path.join(pagesDir, "blog/tags/index.astro"),
        });
        injectRoute({
          pattern: "/blog/tag/[tag]",
          entrypoint: path.join(pagesDir, "blog/tag/[tag]/index.astro"),
        });
        injectRoute({
          pattern: "/blog/tag/[tag]/pages/[page]",
          entrypoint: path.join(pagesDir, "blog/tag/[tag]/pages/[page].astro"),
        });
        injectRoute({
          pattern: "/blog/search",
          entrypoint: path.join(pagesDir, "blog/search.astro"),
        });
      },
    },
  };
}
