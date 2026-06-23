// Normalize a user-supplied base path to Waku's expected form: leading and
// trailing slash, collapsed duplicate slashes. `/` (root) is returned as-is.
// Waku's `basePath` must end with `/` (its adapter slices `basePath.length-1`);
// `asset.ts`'s `basePrefix()` strips the trailing slash for its own use.
export function normalizeBasePath(input?: string): string {
  if (!input || input === '/') return '/';
  let p = input.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  return p.replace(/\/{2,}/g, '/');
}
