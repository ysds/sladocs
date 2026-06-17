import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // Route handler tests live in tests/: waku treats every file under
    // src/pages as a route module, so they cannot be co-located there.
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
