import type { AstroIntegration } from "astro";
import { join } from "node:path";

const pagesDir = join(import.meta.dirname, "astro/pages");

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
        injectRoute({ pattern: "/blog/", entrypoint: join(pagesDir, "blog/index.astro") });
        injectRoute({
          pattern: "/blog/pages/[page]",
          entrypoint: join(pagesDir, "blog/pages/[page].astro"),
        });
        injectRoute({
          pattern: "/blog/[category]/[ym]/[slug]",
          entrypoint: join(pagesDir, "blog/[category]/[ym]/[slug].astro"),
        });
        injectRoute({ pattern: "/blog/tags", entrypoint: join(pagesDir, "blog/tags/index.astro") });
        injectRoute({
          pattern: "/blog/tag/[tag]",
          entrypoint: join(pagesDir, "blog/tag/[tag]/index.astro"),
        });
        injectRoute({
          pattern: "/blog/tag/[tag]/pages/[page]",
          entrypoint: join(pagesDir, "blog/tag/[tag]/pages/[page].astro"),
        });
        injectRoute({ pattern: "/blog/search", entrypoint: join(pagesDir, "blog/search.astro") });
      },
    },
  };
}
