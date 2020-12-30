module.exports = {
  env: { browser: true, es2021: true },
  extends: [
    'plugin:react/recommended',
    'plugin:mdx/recommended',
    'standard',
    'prettier'
  ],
  plugins: ['react', '@typescript-eslint'],
  overrides: [
    {
      files: ['*.mdx'],
      extends: ['plugin:mdx/overrides']
    }
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'react/react-in-jsx-scope': 'off'
  },
  settings: {
    react: {
      version: 'detected'
    }
  }
}
