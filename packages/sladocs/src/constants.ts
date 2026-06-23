import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The package root: the nearest ancestor of this module that contains a
// package.json. Walking up rather than hard-coding "../../.." keeps this correct
// regardless of how the bundler places this module within dist/ (a shared chunk
// sits one level shallower than the CLI entries that import it).
function findPackageRoot(from: string): string {
  let dir = from;
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Could not locate package root (no package.json found)');
    }
    dir = parent;
  }
  return dir;
}

export const baseDir = findPackageRoot(
  path.dirname(fileURLToPath(import.meta.url)),
);
