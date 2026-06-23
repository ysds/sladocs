import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { normalizeProjects } from '@/lib/source/config.js';
import { createIgnoreMatcher } from '@/lib/source/gitignore.js';

// The dynamic `/api/asset/<slug>/<rel>` route does not exist in a static build,
// so the files it would have served must be placed on disk at the same paths.
// We copy the files that route would serve (non-dotfile, non-git-ignored) into
// `<out>/api/asset/<slug>/...`, minus the Markdown/meta sources that are already
// rendered to HTML pages. Copying every such file (not just ones referenced in
// Markdown) keeps transitive references working — e.g. a copied JS that fetches
// a sibling JSON — without parsing Markdown for explicit references.
//
// No base-path prefix is added here: waku writes the HTML pages flat under
// `out/` (their links carry the base path, but the files themselves are not
// nested), and the host places the whole `out/` under the base path. Assets
// sit flat alongside, so `out/api/asset/...` lines up with the `/<base>/api/...`
// links once served.
//
// `assetUrl` percent-encodes URL segments, but the dynamic server decodes them
// before touching the filesystem; the real (decoded) names are written here.
const ASSET_DIR = 'api/asset';

export async function copyAssets(out: string): Promise<number> {
  const config = await getConfigRuntime();
  const projects = normalizeProjects(config);

  let copied = 0;
  for (const project of projects) {
    const isIgnored = await createIgnoreMatcher(project.dir, project.exclude);
    const destRoot = path.join(out, ASSET_DIR, project.slug);

    for await (const absFile of walk(project.dir, isIgnored)) {
      if (skip(absFile)) continue;
      const rel = path.relative(project.dir, absFile);
      const dest = path.join(destRoot, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(absFile, dest);
      copied++;
    }
  }
  return copied;
}

// Files already turned into HTML pages, or never served as assets.
function skip(file: string): boolean {
  const base = path.basename(file);
  if (base.startsWith('.')) return true; // dotfiles are never served
  if (base === 'meta.json') return true; // navigation definition, not an asset
  const ext = path.extname(file).toLowerCase();
  return ext === '.md' || ext === '.mdx';
}

// Recursively yield absolute file paths under `dir`, pruning ignored
// directories (so node_modules is skipped wholesale, not walked then filtered).
async function* walk(
  dir: string,
  isIgnored: (absPath: string) => boolean,
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (isIgnored(abs)) continue;
    if (entry.isDirectory()) {
      yield* walk(abs, isIgnored);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}
