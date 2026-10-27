export const site = {
  slug: "mijime",
  name: "mijime",
  shortName: "mijime",
  description: "mijime apps, blog and experiments",
  themeColor: "#b04e52",
  backgroundColor: "#faf8f3",
  icon: "mi",
};

export const apps = [
  {
    slug: "madories",
    name: "madories",
    shortName: "madories",
    description: "floor plan editor",
    themeColor: "#35357d",
    backgroundColor: "#faf8f3",
    icon: "ma",
  },
  {
    slug: "mintodo",
    name: "mintodo",
    shortName: "mintodo",
    description: "mindmap todo",
    themeColor: "#5a6b3c",
    backgroundColor: "#faf8f3",
    icon: "mi",
  },
  {
    slug: "saiflow",
    name: "saiflow",
    shortName: "saiflow",
    description: "life simulation",
    themeColor: "#96661d",
    backgroundColor: "#faf8f3",
    icon: "sa",
  },
  {
    slug: "lords-of-the-stigmata",
    name: "lords-of-the-stigmata",
    shortName: "lords",
    description: "3D board game",
    themeColor: "#7e5c96",
    backgroundColor: "#15141a",
    icon: "lo",
  },
  {
    slug: "emolog",
    name: "emolog",
    shortName: "emolog",
    description: "emotion logger",
    themeColor: "#b04e52",
    backgroundColor: "#faf8f3",
    icon: "em",
  },
  {
    slug: "otete",
    name: "otete",
    shortName: "otete",
    description: "toddler activity box",
    themeColor: "#96661d",
    backgroundColor: "#faf8f3",
    icon: "ot",
  },
  {
    slug: "flowdeck",
    name: "flowdeck",
    shortName: "flowdeck",
    description: "co-op kanban deckbuilder",
    themeColor: "#3f6e66",
    backgroundColor: "#faf8f3",
    icon: "fl",
  },
];

export function manifestFor(app) {
  const base = `/apps/${app.slug}`;
  return {
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    id: base,
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "any",
    background_color: app.backgroundColor,
    theme_color: app.themeColor,
    icons: [
      {
        src: `/icons/${app.slug}-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/${app.slug}-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/${app.slug}-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

export function siteManifest() {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: site.backgroundColor,
    theme_color: site.themeColor,
    icons: [
      { src: "/icons/site-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/site-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/site-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
