const path = require('path')

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'source/js/browser'),
    slide: path.resolve(__dirname, 'source/js/browser/slide')
  },
  output: {
    path: path.resolve(__dirname, 'static/js'),
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader']
      }
    ]
  },
  externals: {
    mermaid: true,
    'highlight.js': 'hljs'
  },
  devtool: 'source-map'
}
