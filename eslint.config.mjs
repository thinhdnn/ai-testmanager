import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], plugins: { js }, extends: ["eslint:recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact
    },
    rules: {
      ...pluginReact.configs.recommended.rules
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];