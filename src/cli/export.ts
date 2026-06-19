import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export async function runExport(
  dirs: string[],
  outDir: string,
  baseDir: string,
): Promise<void> {
  const rootDir = process.cwd();
  const targets = dirs.length > 0 ? dirs : [''];
  const resolvedOut = path.resolve(rootDir, outDir);

  process.env.ROOT_DIR = rootDir;
  process.env.SLADOCS_STATIC = '1';
  process.env.DEFAULT_PROJECT_DIR = JSON.stringify(
    targets.map((dir) => path.resolve(rootDir, dir)),
  );

  // Run waku build from the sladocs package directory
  console.log('Building static site...');
  execFileSync('npx', ['waku', 'build'], {
    cwd: baseDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  // Copy waku build output to the output directory
  const wakuPublic = path.join(baseDir, 'dist', 'waku', 'public');
  if (!fs.existsSync(wakuPublic)) {
    console.error('Build failed: dist/waku/public not found');
    process.exit(1);
  }

  fs.cpSync(wakuPublic, resolvedOut, { recursive: true });
  console.log(`Static site written to ${resolvedOut}`);
}
