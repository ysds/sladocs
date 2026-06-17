import { describe, expect, it } from 'vitest';
import { localeFromPathname, localeName, localePrefix, resolveSlugs } from './i18n.js';
import type { I18nConfig } from '@/config/schema.js';

const i18n: I18nConfig = {
  languages: ['en', 'ja'],
  defaultLanguage: 'en',
  parser: 'dot',
};

describe('resolveSlugs', () => {
  it('treats a leading non-default language as the locale', () => {
    expect(resolveSlugs(['ja', 'guide'], i18n)).toEqual({ locale: 'ja', slugs: ['guide'] });
    expect(resolveSlugs(['ja'], i18n)).toEqual({ locale: 'ja', slugs: [] });
  });

  it('keeps a leading default-language segment as a page slug', () => {
    expect(resolveSlugs(['en', 'guide'], i18n)).toEqual({
      locale: 'en',
      slugs: ['en', 'guide'],
    });
  });

  it('falls back to the default language without a locale prefix', () => {
    expect(resolveSlugs(['guide'], i18n)).toEqual({ locale: 'en', slugs: ['guide'] });
    expect(resolveSlugs([], i18n)).toEqual({ locale: 'en', slugs: [] });
  });

  it('does not treat unknown languages as locales', () => {
    expect(resolveSlugs(['fr', 'guide'], i18n)).toEqual({
      locale: 'en',
      slugs: ['fr', 'guide'],
    });
  });

  it('returns an empty locale without i18n config', () => {
    expect(resolveSlugs(['guide'], undefined)).toEqual({ locale: '', slugs: ['guide'] });
  });
});

describe('localePrefix', () => {
  it('prefixes non-default locales', () => {
    expect(localePrefix('ja', i18n)).toBe('/ja');
  });

  it('returns no prefix for the default locale or without i18n', () => {
    expect(localePrefix('en', i18n)).toBe('');
    expect(localePrefix('ja', undefined)).toBe('');
  });
});

describe('localeName', () => {
  it('prefers an explicit names entry', () => {
    expect(localeName('ja', { ...i18n, names: { ja: 'にほんご' } })).toBe('にほんご');
  });

  it('falls back to the autonym via Intl', () => {
    expect(localeName('ja', i18n)).toBe('日本語');
    expect(localeName('en', i18n)).toBe('English');
  });

  it('falls back to the raw code for invalid locales', () => {
    expect(localeName('not a locale', i18n)).toBe('not a locale');
  });
});

describe('localeFromPathname', () => {
  it('extracts the locale from a pathname', () => {
    expect(localeFromPathname('/ja/guide', i18n)).toBe('ja');
    expect(localeFromPathname('/guide', i18n)).toBe('en');
    expect(localeFromPathname('/', i18n)).toBe('en');
  });
});
