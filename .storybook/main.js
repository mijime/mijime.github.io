const path = require('path')

module.exports = {
  stories: ['../src/components/**/*.stories.{mdx,tsx}'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  webpackFinal: async config => {
    config.module.rules = [
      ...config.module.rules.filter(
        rule => rule.test.source !== /\.css$/.source
      ),
      {
        test: /\.css$/,
        use: [
          require.resolve('style-loader'),
          require.resolve('css-loader'),
          require.resolve('postcss-loader')
        ]
      }
    ]

    config.resolve.alias = {
      '@': path.resolve(__dirname, '../src')
    }
    return config
  }
}
