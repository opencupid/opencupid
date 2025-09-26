import path from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import { defineConfig } from "eslint/config";

// Ensure TypeScript parser resolves tsconfig relative to this config file
const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

// Create a custom TypeScript ESLint recommended config with tsconfigRootDir
const customTsConfig = [
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir
      }
    }
  },
  ...tseslint.configs.recommended
];

export default defineConfig([
  { ignores: ["dist/**", "dev-dist/**", "node_modules/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"], languageOptions: { globals: globals.browser } },
  ...customTsConfig,
  pluginVue.configs["flat/essential"],
  { files: ["**/*.vue"], languageOptions: { parserOptions: { parser: tseslint.parser } } },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-this-alias": "off",
      "vue/multi-word-component-names": "off",
      "no-undef": "off",
      "no-prototype-builtins": "off"
    }
  }
]);
