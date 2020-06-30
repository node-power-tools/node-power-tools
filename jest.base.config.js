const nodePowerTools = '@node-power-tools'
const prefix = (module) => `${nodePowerTools}/${module}`
const nptModules = [`cache-tools`, `logging-tools`, `concurrent-tools`].map(prefix).join('|')

module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(.*.(test|spec)).(ts)$',
  coveragePathIgnorePatterns: ['(tests/.*.mock).(jsx?|tsx?)$'],
  verbose: true,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/testSetup.js'],
  setupFiles: ['<rootDir>/test/setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/*/dist/',
    '<rootDir>/packages/*/node_modules/',
  ],
  transformIgnorePatterns: [`/node_modules/(?!${nptModules})`],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: {
        warnOnly: true,
      },
    },
  },
  preset: 'ts-jest',
}
