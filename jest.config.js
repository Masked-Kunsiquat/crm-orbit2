module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|expo-sqlite|expo-file-system|expo-sharing|react-native)/)',
    'node_modules/react-native/.*\.js$',
  ],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-sharing$': '<rootDir>/__mocks__/expo-sharing.js',
    // Map relative imports to test mocks
    '^\.\./database$': '<rootDir>/src/services/__tests__/__mocks__/database.js'
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

