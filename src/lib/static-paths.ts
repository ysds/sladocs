import type { I18nConfig } from '@/config/schema.js';

interface PageWithSlugs {
  slugs: string[];
}

export function buildStaticPaths(
  pages: PageWithSlugs[],
  i18n: I18nConfig | undefined,
): string[][] {
  const locales = i18n?.languages ?? [];
  const defaultLocale = i18n?.defaultLanguage;

  const seen = new Set<string>();
  const paths: string[][] = [];

  function add(slugs: string[]) {
    const key = slugs.join('\0');
    if (seen.has(key)) return;
    seen.add(key);
    paths.push(slugs);
  }

  // Root index (empty slugs = /)
  add([]);
  for (const locale of locales) {
    if (locale !== defaultLocale) add([locale]);
  }

  for (const page of pages) {
    add(page.slugs);
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      add([locale, ...page.slugs]);
    }
  }

  return paths;
}
