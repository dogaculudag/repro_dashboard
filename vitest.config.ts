import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts'],
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    env: {
      NODE_ENV: 'test',
    },
    // Run test files sequentially to avoid DB conflicts (shared repro_test DB)
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
