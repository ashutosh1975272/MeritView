import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['src/__tests__/auth/integration/**/*.integration.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: [],
  },
});
