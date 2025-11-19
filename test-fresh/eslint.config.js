// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  globalIgnores(['dist/*']),
  expoConfig,
  {
    files: ['babel.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*'],
  },
]);
