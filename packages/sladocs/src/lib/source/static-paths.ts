import { getSource } from '@/lib/source/index.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { localePrefix } from '@/lib/source/i18n.js';

// Enumerate every reachable catch-all URL as an array of path segments, for the
// `[...slugs]` route's `staticPaths` in SSG mode. Each segment array is injected
// back as the `slugs` prop (`[]` -> "/"). Mirrors the page component's branches:
// the per-locale root listing (slugs.length === 0) plus every page (real pages
// and synthetic project-index pages, which the loader also assigns a `.url`).
// `page.url` already carries the locale prefix for non-default languages.
export async function computeStaticPaths(): Promise<string[][]> {
  const config = await getConfigRuntime();
  const { source } = await getSource(config);
  const langs = config.i18n ? config.i18n.languages : [undefined];

  const seen = new Set<string>();
  const add = (segments: string[]) => seen.add(JSON.stringify(segments));

  for (const lang of langs) {
    const prefix = localePrefix(lang ?? '', config.i18n);
    add(prefix ? prefix.slice(1).split('/') : []);
    for (const page of source.getPages(lang)) {
      add(page.url.split('/').filter(Boolean));
    }
  }
  return [...seen].map((s) => JSON.parse(s) as string[]);
}
