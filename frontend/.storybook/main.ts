import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-docs"
  ],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {
      "builder": {
        "viteConfigPath": "./vite.storybook.config.ts"
      }
    }
  },
  // "core": {
  //   "builder":
  //   {
  //     name: "@storybook/builder-vite",
  //     "options": {
  //       "viteConfig": {
  //         "configFile": "../vite.storybook.config.ts",
  //       }
  //     }
  //   }
  // },
};
export default config;
