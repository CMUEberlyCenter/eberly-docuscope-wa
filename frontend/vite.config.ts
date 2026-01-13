import react from '@vitejs/plugin-react';
// import { visualizer } from "rollup-plugin-visualizer";
import vike from 'vike/plugin';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { version } from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vike(), react(), /*visualizer(),*/ svgr()],
  build: {
    // sourcemap: mode === 'development',
    // minify: mode !== 'development',
    // rollupOptions: {
    //   // input: {
    //   //   main: resolve(__dirname, 'index.html'),
    //   //   deeplink: resolve(__dirname, 'deeplink.html'),
    //   //   review: resolve(__dirname, 'review.html'),
    //   //   genlink: resolve(__dirname, 'genlink.html'),
    //   // },
    //   output: {
    //     // dir: 'build/app',
    //     manualChunks(id: string) {
    //       if (id.includes('d3')) { return 'vendor-d3'; }
    //       if (id.includes('@fortawesome')) { return 'vendor-@fortawesome'; }
    //       if (id.includes('slate')) { return 'vendor-slate'; }
    //     }
    //   }
    // },
    target: 'ES2022',
  },
  css: {
    preprocessorOptions: {
      scss: {
        // quiet warnings from bootstrap, monitor this when bootstrap updates.
        quietDeps: true,
        silenceDeprecations: ['legacy-js-api', 'color-functions', 'import'],
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    // fixes accessing from docker container
    allowedHosts:
      mode !== 'development' ? [] : ['localhost', 'host.docker.internal'],
  },
}));
