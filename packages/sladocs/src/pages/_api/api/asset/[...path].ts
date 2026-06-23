import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { normalizeProjects, type NormalizedProjectConfig } from '@/lib/source/config.js';
import { createIgnoreMatcher } from '@/lib/source/gitignore.js';
import { isInside, resolveAsset } from '@/lib/asset.js';
import { serveFile } from '@/lib/serve-file.js';
import { revalidable } from '@/lib/revalidable.js';

interface ApiContext {
  params?: Record<string, string | string[]>;
}

function getSegments(request: Request, context?: ApiContext): string[] {
  const fromParams = context?.params?.path;
  if (Array.isArray(fromParams)) return fromParams;
  const rest = new URL(request.url).pathname.replace(/^\/api\/asset\//, '');
  return rest.split('/').filter(Boolean);
}

// project.dir may itself sit behind a symlink (/var -> /private/var on macOS);
// its realpath never changes while the server runs, so cache it indefinitely.
const getRealProjectDir = revalidable({
  create: (dir: string) => fs.realpath(dir),
});

// Building a matcher execs `git ls-files`, too slow per request. A short
// staleTime keeps responses fast while picking up gitignore changes within a
// few seconds — fine for a preview server. The matcher is built on the real
// project dir so realpath'd file paths relativize against the same root.
const getIgnoreMatcher = revalidable({
  staleTime: 5_000,
  create: async (project: NormalizedProjectConfig) =>
    createIgnoreMatcher(await getRealProjectDir(project.dir), project.exclude),
  cacheKey: (project) => [project.dir, ...project.exclude].join('\0'),
});

// Not-found, unknown project, and ignored files all answer 404: an excluded
// file must be indistinguishable from a missing one.
const notFound = () => new Response(null, { status: 404 });

export async function GET(request: Request, context?: ApiContext) {
  const [slug, ...rel] = getSegments(request, context);
  if (!slug || rel.length === 0) return notFound();

  const config = await getConfigRuntime();
  const project = normalizeProjects(config).find((p) => p.slug === decodeURIComponent(slug));
  if (!project) return notFound();

  // Lexical checks reject traversal and dot basenames early.
  const file = resolveAsset(project, rel);
  if (!file) return notFound();

  // Re-run every check against the on-disk identity: realpath resolves
  // symlinks, case variants and 8.3 short names, so an aliased path can no
  // longer smuggle past the lexical checks.
  let real: string;
  let realDir: string;
  try {
    [real, realDir] = await Promise.all([fs.realpath(file), getRealProjectDir(project.dir)]);
  } catch {
    return notFound();
  }
  if (!isInside(realDir, real)) return notFound();
  if (path.basename(real).startsWith('.')) return notFound();

  const isIgnored = await getIgnoreMatcher(project);
  if (isIgnored(real)) return notFound();

  return serveFile(request, real);
}

export async function getConfig() {
  return { render: 'dynamic' } as const;
}
