import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactNative from "eslint-plugin-react-native";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import localPlugin from "./eslint-rules/index.js";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __DEV__: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        crypto: "readonly",
        test: "readonly",
        expect: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        it: "readonly",
        jest: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: react,
      "react-native": reactNative,
      "react-hooks": reactHooks,
      prettier: prettier,
      local: localPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "local/no-duplicate-helpers": "error",
      "local/enforce-i18n-validation": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "prettier/prettier": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["utils/logger.ts"],
    rules: {
      // Logger is allowed to use console methods
      "no-console": "off",
    },
  },
  {
    files: ["domains/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/views/**", "**/reducers/**"],
              message:
                "Domain layer cannot import from views or reducers layers. Keep domain logic pure and framework-agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/reducers/**"],
              message:
                "Views should use hooks (e.g., useContactActions) instead of directly importing reducers. This maintains proper separation of concerns.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["reducers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/views/**"],
              message:
                "Reducers cannot import from views layer. Reducers should be pure functions that only depend on domain models and events.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },
];
