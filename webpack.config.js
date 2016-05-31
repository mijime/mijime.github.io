module.exports = {
  entry: "./source/js/browser",
  output: {
    path: __dirname,
    filename: "static/js/bundle.js"
  },
  module: {
    loaders: [{ test: /\.js$/, loader: "babel" }]
  },
  externals: {
    mermaid: "mermaid"
  }
};
