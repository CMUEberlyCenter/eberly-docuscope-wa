import pluginJs from "@eslint/js";
import react from "@eslint-react/eslint-plugin";
import storybook from "eslint-plugin-storybook"; // For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...react.configs["recommended-typescript"],
    files: ['index.ts', 'src/**/*.{js,jsx,mjs,cjs,ts,tsx}', 'components/**/*.{js,jsx,mjs,cjs,ts,tsx}', 'layouts/**/*.{js,jsx,mjs,cjs,ts,tsx}', 'pages/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
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
