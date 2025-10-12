import { defineConfig } from 'vitest/config';
import { setupTestServer, teardownTestServer } from './tests/test-server';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/contract/**/*.test.{js,ts,jsx,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    globalSetup: './tests/global-setup-contract.ts',
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
});
