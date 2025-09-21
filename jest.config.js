module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store)/)'
  ],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    // Map relative '../database' imports (from services) to a test mock
    '^\.\./database$': '<rootDir>/src/services/__mocks__/database.js'
  },
  // Enable coverage collection and output a JSON summary for badges
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text', 'lcov'],
  // Place coverage at repo root to match action default ./coverage
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/__mocks__/**'
  ],
};

