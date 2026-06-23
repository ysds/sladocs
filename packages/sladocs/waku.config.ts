import { fileURLToPath } from 'node:url';
import { defineConfig } from 'waku/config';
import tailwindcss from '@tailwindcss/vite';

// On Vercel, let waku pick its platform adapter (serverless functions).
// For a static build, no adapter is needed (waku writes files directly), and
// pulling in the Node adapter would require its preview-server deps (hono,
// chokidar) that the static-build package does not ship.
// Otherwise (the local preview CLI) use our Node adapter with hot reload.
const adapter =
  process.env.VERCEL || process.env.SLADOCS_STATIC === '1'
    ? undefined
    : './src/lib/waku/adapter.ts';

// Subpath base for static (subpath-hosted) builds, e.g. "/repo/". Must end "/".
const basePath = process.env.SLADOCS_BASE_PATH || '/';

// Resolve "@/..." to ./src explicitly rather than relying on
// resolve.tsconfigPaths, which only handles TS module imports (not CSS) and
// requires `typescript` to be installed. An explicit alias works for every file
// type and across pnpm/npm layouts (e.g. the sladocs-build runtime).
const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  distDir: 'dist/waku',
  basePath,
  ...(adapter ? { unstable_adapter: adapter } : {}),
  vite: {
    resolve: {
      alias: { '@': srcDir },
    },
    plugins: [tailwindcss()],
  },
});
