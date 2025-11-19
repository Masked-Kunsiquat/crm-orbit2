/**
 * Jest setup file for test-fresh project
 * Configures mocks and global test utilities
 */

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [
    {
      languageTag: 'en-US',
      locale: 'en-US',
    },
  ]),
}));

// Suppress console warnings in tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // warn: jest.fn(),
  // error: jest.fn(),
};
