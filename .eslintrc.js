module.exports = {
  env: { browser: true, es2021: true },
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:mdx/recommended',
    'plugin:react/recommended',
    'standard',
    'prettier'
  ],
  plugins: ['import', 'react', '@typescript-eslint'],
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
    'react/react-in-jsx-scope': 'off',
    'import/order': [
      'warn',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ]
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      },
      typescript: {}
    },
    react: {
      version: 'detected'
    }
  }
}
