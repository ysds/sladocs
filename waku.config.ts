import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';

// On Vercel, let waku pick its platform adapter (serverless functions).
// Locally / for the CLI, use our Node adapter with hot reload.
const adapter = process.env.VERCEL ? undefined : './src/lib/waku/adapter.ts';

export default defineConfig({
  distDir: 'dist/waku',
  ...(adapter ? { unstable_adapter: adapter } : {}),
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss()],
  },
});
