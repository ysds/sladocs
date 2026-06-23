import path from 'node:path';
import { z } from 'zod';

// Static build mode: set by the static-build entry point so page `getConfig`
// switches from per-request dynamic rendering to build-time SSG.
export const isStatic = () => process.env.SLADOCS_STATIC === '1';

const dirsSchema = z.array(z.string());

// Returns absolute project directories. Callers resolve these against ROOT_DIR
// again, so returning relative paths here would double-apply ROOT_DIR (e.g.
// ROOT_DIR=docs -> docs/docs). Absolute paths make that re-resolution a no-op.
export function getDefaultProjectDirectories(): string[] {
  const root = process.env.ROOT_DIR ?? process.cwd();
  const raw = process.env.DEFAULT_PROJECT_DIR;
  if (raw) {
    try {
      const parsed = dirsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data.map((dir) => path.resolve(root, dir));
    } catch {
      // fallthrough
    }
  }
  return [path.resolve(root)];
}
