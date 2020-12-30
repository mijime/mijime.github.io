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
  trailingSlash: true
})
