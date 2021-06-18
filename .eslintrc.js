const fs = require('fs')

const walkDir = function walkDir(dir) {
  const dirs = fs
    .readdirSync(dir)
    .map(subdir => `${dir}/${subdir}`)
    .filter(subdir => fs.statSync(subdir).isDirectory())
    .map(subdir => walkDir(subdir))
    .flat()
  return dirs.length > 0 ? dirs : [dir]
}

const getExcept = function getExcept(dir) {
  if (dir.startsWith('src/domains/entities')) {
    return []
  }
  if (dir.startsWith('src/domains/repositories')) {
    return ['domains']
  }
  if (dir.startsWith('src/usecases/')) {
    return ['domains']
  }
  if (dir.startsWith('src/components/atoms')) {
    return ['styles']
  }
  if (dir.startsWith('src/components/molecules')) {
    return [
      'styles',
      'components/atoms',
      'components/functions',
      'components/molecules',
      'infrastructures'
    ]
  }
  return null
}

const zones = walkDir('src')
  .map(srcDir => {
    const except = getExcept(srcDir)
    if (except === null) {
      return null
    }
    return {
      target: srcDir,
      from: 'src',
      except
    }
  })
  .filter(x => x !== null)

module.exports = {
  env: { browser: true, es2021: true },
  extends: [
    'eslint:all',
    'plugin:react/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'standard',
    'prettier'
  ],
  overrides: [
    { files: ['*.stories.tsx'], rules: { 'import/no-restricted-paths': 'off' } }
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: ['import', 'react', '@typescript-eslint'],
  rules: {
    'class-methods-use-this': 'off',
    'id-length': 'off',
    'max-lines-per-function': 'off',
    'no-magic-numbers': 'off',
    'no-ternary': 'off',
    'no-underscore-dangle': 'off',
    'sort-imports': 'off',
    'sort-keys': 'off',
    'react/react-in-jsx-scope': 'off',
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ],
    'import/no-cycle': 'error',
    'import/no-restricted-paths': ['error', { zones }]
  },
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      typescript: {}
    },
    react: { version: 'detected' }
  }
}
