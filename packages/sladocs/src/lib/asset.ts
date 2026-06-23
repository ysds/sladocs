import path from 'node:path';
import type { NormalizedProjectConfig } from '@/lib/source/config.js';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.apng': 'image/apng',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mdx': 'text/markdown; charset=utf-8',
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

// True for an absolute URL or a protocol-relative (`//host/...`) reference.
export function isAbsoluteRef(ref: string): boolean {
  return URL.canParse(ref) || ref.startsWith('//');
}

const ASSET_PREFIX = '/api/asset';

// Base path prefix for static (subpath) builds. Read per-call, not at module
// load, so it reflects the env set for the current build/request and stays
// stubbable in tests. Empty in dynamic mode -> URLs unchanged.
function basePrefix(): string {
  return (process.env.SLADOCS_BASE_PATH || '/').replace(/\/$/, '');
}

// Prefix an app-internal absolute URL with the static base path. The framework
// router auto-prefixes its own <Link>s; this is for the plain <a> elements we
// render ourselves (page-tree listings), which it does not touch.
export function withBase(url: string): string {
  return url.startsWith('/') ? `${basePrefix()}${url}` : url;
}

// Build a serving URL for a relative reference inside a Markdown page.
// The reference is normalized to a path relative to project.dir so that the
// resulting URL keeps the real directory structure — relative references inside
// the served file (e.g. ./app.js) then resolve under the same prefix.
export function assetUrl(
  project: NormalizedProjectConfig,
  pageAbsPath: string,
  src: string,
): string {
  const abs = path.resolve(path.dirname(pageAbsPath), src);
  const rel = path.relative(project.dir, abs);
  const segments = rel.split(path.sep).map(encodeURIComponent);
  return `${basePrefix()}${ASSET_PREFIX}/${encodeURIComponent(project.slug)}/${segments.join('/')}`;
}

export function isInside(dir: string, file: string): boolean {
  const rel = path.relative(dir, file);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

// Resolve catch-all URL segments to a real file path, guarding against
// directory traversal outside project.dir. Files whose name starts with a dot
// (.env and the like) are never served, regardless of gitignore status;
// dot-directories stay reachable so references like .github/assets/logo.png
// keep working.
export function resolveAsset(
  project: NormalizedProjectConfig,
  segments: string[],
): string | null {
  const rel = segments.map((s) => decodeURIComponent(s)).join(path.sep);
  const file = path.resolve(project.dir, rel);
  if (!isInside(project.dir, file)) return null;
  if (path.basename(file).startsWith('.')) return null;
  return file;
}
