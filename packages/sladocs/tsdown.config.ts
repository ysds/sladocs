import { defineConfig } from 'tsdown';

export default defineConfig({
  target: 'es2023',
  format: 'esm',
  entry: {
    'cli/index': 'src/cli/index.ts',
    'cli/build-cli': 'src/cli/build-cli.ts',
  },
  outDir: 'dist/lib',
  dts: false,
  sourcemap: false,
});
