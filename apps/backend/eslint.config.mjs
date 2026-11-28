import path from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
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
  { ignores: ["dist/**", "node_modules/**", "scripts/**", "prisma/seed/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  customTsConfig,
  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "off"
    }
  },
  {
    // Restricted profile images must never reach a viewer who is not eligible for
    // them. Galleries are loaded only through profileImagesRelation(), which leaves
    // them out unless the caller opts in.
    files: ["src/**/*.ts"],
    ignores: ["src/db/includes/profileIncludes.ts", "src/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='profileImages'][value.type='ObjectExpression']",
          message:
            "Load profile galleries with profileImagesRelation() / profileImageInclude() so restricted images stay filtered."
        }
      ]
    }
  }
]);
