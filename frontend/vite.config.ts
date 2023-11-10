import react from '@vitejs/plugin-react';
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin(), visualizer()],
  build: {
    rollupOptions: {
      output: {
        dir: 'build/app',
        manualChunks(id: string) {
          if (id.includes('d3')) { return 'vendor-d3'; }
          if (id.includes('@fortawesome')) { return 'vendor-@fortawesome'; }
          if (id.includes('slate')) { return 'vendor-slate'; }
        }
      }
    }
  }
})
