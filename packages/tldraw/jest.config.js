/** Jest config for @tlslides/tldraw */
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/../../setupTests.ts'],
  transform: {
    '^.+\\.(tsx|jsx|ts|js|mjs)?$': ['@swc-node/jest', {
      module: 'commonjs',
      swcOptions: {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
        },
      },
    }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '@tlslides/tldraw': '<rootDir>/src',
    '\\~(.*)': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!(playwright|playwright-core)/)'],
}
