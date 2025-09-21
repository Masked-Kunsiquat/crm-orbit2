// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  // Test files: enable Jest and Node globals for ESLint flat config
  {
    files: ["**/__tests__/**/*.js", "**/*.test.js", "**/__mocks__/**/*.js"],
    languageOptions: {
      globals: {
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        // Node test env helpers
        __dirname: "readonly"
      }
    }
  },
  {
    ignores: ["dist/*"],
  }
  ,
  // Navigation: allow Expo vector icons subpath/module resolution in lint
  {
    files: ["src/navigation/MainNavigator.js"],
    rules: {
      "import/no-unresolved": "off",
    }
  }
]);
