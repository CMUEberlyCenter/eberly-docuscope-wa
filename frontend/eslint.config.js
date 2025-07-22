import pluginJs from "@eslint/js";
import react from "eslint-plugin-react";
import storybook from "eslint-plugin-storybook"; // For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import globals from "globals";
import tseslint from "typescript-eslint";


export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/app/**/*.{js,jsx,mjs,cjs,ts,tsx'],
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: { ...globals.browser }
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_" }
      ]
    }
  },
  ...storybook.configs["flat/recommended"]
];
