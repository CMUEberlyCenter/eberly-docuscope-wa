import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from '@vitejs/plugin-react';
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
    },
    projects: [
      {
        extends: "vite.storybook.config.ts",
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        }
      }
    ]
  },
});
