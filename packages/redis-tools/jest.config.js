module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/test/testSetup.js'
  ],
  setupFiles: [
    '<rootDir>/test/setup.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      diagnostics: {
        warnOnly: true
      }
    }
  },
  preset: 'ts-jest'
}
