const withMdxEnhanced = require('next-mdx-enhanced')
const highlight = require('remark-highlight.js')

module.exports = withMdxEnhanced({
  layoutPath: 'src/components/pages/post/',
  defaultLayout: true,
  fileExtensions: ['md', 'mdx'],
  remarkPlugins: [() => highlight({ exclude: ['mermaid'] })],
  extendFrontMatter: {
    phase: 'both'
  },
  reExportDataFetching: false
})({
  trailingSlash: true,
  webpack(config, { isServer, dev }) {
    if (isServer && !dev) {
      require('ts-node/register')
      require('tsconfig-paths/register')
      const { generateSitemap } = require('./src/scripts/generate-sitemap')

      generateSitemap('public/sitemap.xml')
        .then(() => console.log('generateSitemap::succeed'))
        .catch(err => console.log('generateSitemap::failed', err))
    }
    return config
  }
})
