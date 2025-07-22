/** Vike and storybook do not play well together so need an
 * alternative vite config for storybook.
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { version } from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), svgr()],
  build: {
    sourcemap: true, // always true for storybook
    minify: false, // always false for storybook
    target: "ES2022",
  },
  css: {
    preprocessorOptions: {
      scss: {
        // quiet warnings from bootstrap, monitor this when bootstrap updates.
        quietDeps: true,
        silenceDeprecations: ['legacy-js-api', 'color-functions', 'import']
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  },
}))
