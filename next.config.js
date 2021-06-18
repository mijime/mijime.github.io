const highlight = require('remark-highlight.js')

module.exports = {
  pageExtensions: ['tsx', 'mdx', 'md'],
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
}
