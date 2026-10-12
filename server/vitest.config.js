import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    env: { NODE_ENV: 'test' },
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
