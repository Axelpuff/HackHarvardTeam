import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/integration/**/*.test.{js,ts,jsx,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
});
