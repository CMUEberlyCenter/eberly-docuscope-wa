import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['js/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./js/testing/mock_request.ts'],
    coverage: {
      exclude: ['js/testing/**', '**/*.test.*', '**/*.spec.*']
    }
  },
});
