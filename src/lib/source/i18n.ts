import type { I18nConfig } from '@/config/schema.js';

export interface ResolvedSlugs {
  locale: string;
  slugs: string[];
}

// Split a catch-all route's slugs into a locale and the page slugs, mirroring
// the URLs the loader generates (see `createGetUrl` in fumadocs-core). The
// default language has no prefix, so a leading segment is only treated as a
// locale when it is a non-default language.
export function resolveSlugs(slugs: string[], i18n: I18nConfig | undefined): ResolvedSlugs {
  const fallback = i18n?.defaultLanguage ?? '';
  if (!i18n || slugs.length === 0) return { locale: fallback, slugs };

  const [head, ...rest] = slugs;
  const isLocale =
    head !== undefined && head !== i18n.defaultLanguage && i18n.languages.includes(head);

  return isLocale ? { locale: head, slugs: rest } : { locale: fallback, slugs };
}

// The URL prefix for a locale, e.g. `ja` -> `/ja`, default locale -> ``.
export function localePrefix(locale: string, i18n: I18nConfig | undefined): string {
  if (!i18n || locale === i18n.defaultLanguage) return '';
  return `/${locale}`;
}

// Display name for a locale in the language switcher. An explicit `names` entry
// wins; otherwise fall back to the language's autonym (its own name in its own
// language, e.g. `ja` -> `日本語`) via Intl, and finally to the raw code.
export function localeName(locale: string, i18n: I18nConfig | undefined): string {
  const override = i18n?.names?.[locale];
  if (override) return override;
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

// Locale for a full URL pathname, e.g. `/ja/guide` -> `ja`. Used where only the
// request path is available (the root layout) rather than parsed route slugs.
export function localeFromPathname(pathname: string, i18n: I18nConfig | undefined): string {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  return resolveSlugs(segments, i18n).locale;
}
