import * as fs from 'fs'
import { PostsApp } from '@/applications/posts'
import { SitesApp } from '@/applications/sites'

async function generateSitemapXML(siteURL: string) {
  const { posts } = await PostsApp.fetchPostsByPage({ page: 1, pageSize: 500 })
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteURL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  ${posts
    .map(
      post => `<url>
    <loc>${`${siteURL}/post/${post.slug}/`}</loc>
    <lastmod>${post.date.split('T')[0]}</lastmod>
  </url>
`
    )
    .join('')}
</urlset>`
  return sitemapXML
}

export async function generateSitemap(output: string) {
  const sitemapXML = await generateSitemapXML(SitesApp.getSiteURL())
  return await fs.promises.writeFile(output, sitemapXML)
}
