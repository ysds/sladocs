import path from 'node:path';
import { getDefaultProjectDirectories } from '../env.js';
import type { ParsedAppConfig, ProjectConfig } from '@/config/schema.js';

export interface NormalizedProjectConfig {
  name: string;
  slug: string;
  dir: string;
  include: string[];
  exclude: string[];
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'docs';
}

const DEFAULT_INCLUDE = ['**/*.{md,mdx}', '**/meta.json'];
// node_modules and friends are handled by git ignore resolution (or the
// non-git fallback), so the user's exclude defaults to empty.
const DEFAULT_EXCLUDE: string[] = [];

export function normalizeProjects(config: ParsedAppConfig): NormalizedProjectConfig[] {
  const baseDir = process.env.ROOT_DIR ?? process.cwd();
  const globalExclude = config.exclude ?? [];
  const raw: ProjectConfig[] =
    config.projects && config.projects.length > 0
      ? config.projects
      : getDefaultProjectDirectories().map((dir) => ({ dir }));

  const taken = new Set<string>();
  return raw.map((project) => {
    const dir = path.resolve(baseDir, project.dir);
    const name = project.name ?? path.basename(dir);
    let slug = toSlug(name);
    let suffix = 2;
    while (taken.has(slug)) slug = `${toSlug(name)}-${suffix++}`;
    taken.add(slug);

    return {
      name,
      slug,
      dir,
      include: project.include ?? DEFAULT_INCLUDE,
      exclude: [...globalExclude, ...(project.exclude ?? DEFAULT_EXCLUDE)],
    };
  });
}
