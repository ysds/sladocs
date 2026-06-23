import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { baseDir } from '../constants.js';
import { normalizeBasePath } from '@/lib/static/base-path.js';
import { copyAssets } from '@/lib/static/copy-assets.js';

const require = createRequire(import.meta.url);

export interface BuildOptions {
  dirs: string[];
  out: string;
  basePath: string;
}

// Run the static (SSG) build: drive `waku build` in static mode, then assemble
// the output directory. Runs from `baseDir` (where waku.config.ts and the app
// source live) because waku's build reads `waku.config.ts` from cwd and needs
// the full app source + build deps resolvable there.
export async function runStaticBuild(opts: BuildOptions): Promise<void> {
  const basePath = normalizeBasePath(opts.basePath);
  const out = path.resolve(opts.out);
  const targets = opts.dirs.length > 0 ? opts.dirs : [''];

  // Set the resolution env on this process too: the asset copy below runs here
  // (not in the waku child) and resolves project dirs via normalizeProjects,
  // which reads ROOT_DIR / DEFAULT_PROJECT_DIR. waku reads SLADOCS_* in the child.
  process.env.SLADOCS_STATIC = '1';
  process.env.SLADOCS_BASE_PATH = basePath;
  process.env.ROOT_DIR = process.cwd();
  process.env.DEFAULT_PROJECT_DIR = JSON.stringify(
    targets.map((dir) => path.resolve(dir)),
  );

  await wakuBuild({ ...process.env });

  const publicDir = path.join(baseDir, 'dist', 'waku', 'public');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.cp(publicDir, out, { recursive: true });

  const assetCount = await copyAssets(out);
  console.log(`[sladocs-build] copied ${assetCount} asset file(s)`);

  console.log(`[sladocs-build] static site written to ${out}`);
}

// Spawn the waku CLI's build command in baseDir. We spawn rather than import
// runBuild() to isolate waku's process-level side effects (NODE_ENV override,
// dotenv load, process.exit) from this CLI.
function wakuBuild(env: NodeJS.ProcessEnv): Promise<void> {
  const wakuPkg = require.resolve('waku/package.json');
  const wakuCli = path.join(path.dirname(wakuPkg), 'dist', 'cli.js');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wakuCli, 'build'], {
      cwd: baseDir,
      env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else if (signal) reject(new Error(`waku build was killed by signal ${signal}`));
      else reject(new Error(`waku build exited with code ${code}`));
    });
  });
}
