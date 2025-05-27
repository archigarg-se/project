import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks"; // New import for react-hooks
import pluginJsxA11y from "eslint-plugin-jsx-a11y";     // New import for jsx-a11y
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    // Applies to all JavaScript, TypeScript, and JSX/TSX files
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Define plugins used in this configuration
    plugins: {
      js: js, // Core ESLint JavaScript rules
      react: pluginReact, // React-specific rules
      "react-hooks": pluginReactHooks, // React Hooks rules
      "jsx-a11y": pluginJsxA11y, // JSX Accessibility rules
    },

    // Extend recommended configurations from various plugins
    extends: [
      js.configs.recommended, // ESLint's recommended JavaScript rules
      ...tseslint.configs.recommended, // TypeScript ESLint recommended rules
      ...pluginReact.configs.flat.recommended, // React recommended rules (flat config)
      ...pluginJsxA11y.configs.recommended, // JSX Accessibility recommended rules
    ],

    // Language options for parsing and environment
    languageOptions: {
      // Define global variables available in the browser environment
      globals: {
        ...globals.browser, // Includes browser globals like `window`, `document`, etc.
      },
      // Specify the parser for TypeScript files
      parser: tseslint.parser,
      // Parser options for modern JavaScript and JSX
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
        ecmaVersion: "latest", // Use the latest ECMAScript features
        sourceType: "module", // Allow ES Modules syntax (import/export)
      },
    },

    // Custom rules or overrides
    rules: {
      // Rules specifically for React Hooks (not covered by `extends` for flat config)
      "react-hooks/rules-of-hooks": "error", // Enforce Rules of Hooks
      "react-hooks/exhaustive-deps": "warn", // Check effect dependencies
      // You can add more custom rules or override inherited ones here, for example:
      // "no-console": "warn",
      // "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // You can add more configuration objects here for specific scenarios,
  // e.g., different rules for test files, Node.js files, etc.
]);