import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10000,
    hookTimeout: 10000,
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    thresholds: {
      lines: 80,
      functions: 75,
      branches: 75,
      statements: 80,
    },
  },
});