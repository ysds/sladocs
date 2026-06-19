import { describe, expect, it } from 'vitest';
import { buildStaticPaths } from './static-paths.js';
import type { I18nConfig } from '@/config/schema.js';

const i18n: I18nConfig = {
  languages: ['en', 'ja'],
  defaultLanguage: 'en',
  parser: 'dot',
};

describe('buildStaticPaths', () => {
  it('returns a root entry for no pages', () => {
    const paths = buildStaticPaths([], undefined);
    expect(paths).toEqual([[]]);
  });

  it('returns page slugs without i18n', () => {
    const pages = [
      { slugs: ['guide'] },
      { slugs: ['api', 'reference'] },
    ];
    const paths = buildStaticPaths(pages, undefined);
    expect(paths).toEqual([[], ['guide'], ['api', 'reference']]);
  });

  it('includes locale-prefixed variants for non-default locales', () => {
    const pages = [{ slugs: ['guide'] }];
    const paths = buildStaticPaths(pages, i18n);
    expect(paths).toContainEqual([]);
    expect(paths).toContainEqual(['ja']);
    expect(paths).toContainEqual(['guide']);
    expect(paths).toContainEqual(['ja', 'guide']);
    // Default locale should not be prefixed
    expect(paths).not.toContainEqual(['en']);
    expect(paths).not.toContainEqual(['en', 'guide']);
  });

  it('deduplicates paths', () => {
    const pages = [
      { slugs: ['guide'] },
      { slugs: ['guide'] },
    ];
    const paths = buildStaticPaths(pages, undefined);
    const guideCount = paths.filter((p) => p.length === 1 && p[0] === 'guide').length;
    expect(guideCount).toBe(1);
  });

  it('handles pages with empty slugs (root page)', () => {
    const pages = [{ slugs: [] }];
    const paths = buildStaticPaths(pages, i18n);
    // Root entry is [] (empty array); deduplicates with the default root
    const rootCount = paths.filter((p) => p.length === 0).length;
    expect(rootCount).toBe(1);
  });

  it('handles three locales correctly', () => {
    const threeLocales: I18nConfig = {
      languages: ['en', 'ja', 'zh'],
      defaultLanguage: 'en',
      parser: 'dot',
    };
    const pages = [{ slugs: ['intro'] }];
    const paths = buildStaticPaths(pages, threeLocales);
    expect(paths).toContainEqual(['intro']);
    expect(paths).toContainEqual(['ja', 'intro']);
    expect(paths).toContainEqual(['zh', 'intro']);
    expect(paths).toContainEqual(['ja']);
    expect(paths).toContainEqual(['zh']);
  });
});
