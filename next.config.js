const highlight = require('remark-highlight.js')
const withMdxEnhanced = require('next-mdx-enhanced')

module.exports = withMdxEnhanced({
  layoutPath: 'layouts/post/',
  defaultLayout: true,
  fileExtensions: ['md', 'mdx'],
  remarkPlugins: [() => highlight({ exclude: ['mermaid'] })],
  extendFrontMatter: {
    phase: 'both'
  },
  reExportDataFetching: false
})({
  trailingSlash: true,
  webpack(config, { isServer }) {
    if (isServer) {
      require('ts-node/register')
      require('tsconfig-paths/register')
      const { generateSitemap } = require('./scripts/generate-sitemap')

      generateSitemap('public/sitemap.xml')
        .then(() => console.log('generateSitemap::succeed'))
        .catch(err => console.log('generateSitemap::failed', err))
    }
    return config
  }
})
