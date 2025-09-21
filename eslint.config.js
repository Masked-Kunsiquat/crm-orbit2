// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
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
