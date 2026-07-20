import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig(({ mode }) => ({
  build: {
    ssr: './index.ts',
    outDir: './build/server',
  },
  ssr: {
    external: [
      ...builtinModules,
      ...builtinModules.map((m) => `node:${m}`),
    ]
  }
}));
