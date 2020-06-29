module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'jest', 'import', 'unused-imports'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  settings: {
    'import/extensions': ['.js', '.ts'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  rules: {
    // Opt-in
    '@typescript-eslint/no-explicit-any': 'warn',

    'unused-imports/no-unused-imports-ts': 'error',
    'object-shorthand': 'error',

    // Opt-out
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-empty-function': 'off',

    // Remove restriction on `ForOfStatement` as it's just a highly opinionated rule that doesn't have much merit
    // see https://github.com/airbnb/javascript/issues/1271 for more info
    'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],

    // Configure
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/*.test.js', '**/*.spec.js'],
        peerDependencies: false,
      },
    ],

    'import/order': [
      'error',
      {
        'groups': ['builtin', ['external', 'internal'], ['parent', 'sibling'], ['index']],
        'newlines-between': 'always',
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // line spacing
    'padding-line-between-statements': [
      'error',
      // wildcard inclusions
      {
        blankLine: 'always',
        prev: ['multiline-block-like', 'multiline-const', 'multiline-expression'],
        next: '*',
      },
      {
        blankLine: 'always',
        prev: '*',
        next: ['multiline-block-like', 'multiline-const', 'multiline-expression', 'switch', 'return'],
      },
      // specific exclusions for case statements
      { blankLine: 'never', prev: 'case', next: 'multiline-block-like' },
      { blankLine: 'never', prev: 'multiline-block-like', next: 'case' },
    ],

    // ignore unused vars prefixed with '_'
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
  ignorePatterns: ['node_modules'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/test/*.js'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
}
