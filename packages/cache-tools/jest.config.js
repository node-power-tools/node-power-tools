const nodePowerTools = '@node-power-tools'
const prefix = (module) => `${nodePowerTools}/${module}`
const nptModules = [`cache-tools`, `logging-tools`, `concurrent-tools`].map(prefix).join('|')

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/testSetup.js'],
  setupFiles: ['<rootDir>/test/setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [`/node_modules/(?!${nptModules})`],
  globals: {
    'ts-jest': {
      diagnostics: {
        warnOnly: true,
      },
    },
  },
  preset: 'ts-jest',
}
