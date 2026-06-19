import { describe, expect, it } from 'vitest';
import { configSchema } from './schema.js';

describe('configSchema', () => {
  it('applies defaults to an empty config', () => {
    const config = configSchema.parse({});
    expect(config.site).toEqual({ title: 'sladocs' });
    expect(config.markdown).toEqual({ allowDangerousHtml: 'safe' });
    expect(config.color).toEqual({});
    expect(config.projects).toBeUndefined();
    expect(config.i18n).toBeUndefined();
  });

  it('keeps explicit values', () => {
    const config = configSchema.parse({
      site: { title: 'My Site', github: 'https://github.com/org/repo' },
      markdown: { allowDangerousHtml: 'off' },
      projects: [{ dir: 'docs' }],
    });
    expect(config.site.title).toBe('My Site');
    expect(config.markdown.allowDangerousHtml).toBe('off');
    expect(config.projects).toEqual([{ dir: 'docs' }]);
  });

  it('rejects a project without dir', () => {
    expect(configSchema.safeParse({ projects: [{ name: 'x' }] }).success).toBe(false);
  });

  it('rejects unknown allowDangerousHtml values', () => {
    expect(configSchema.safeParse({ markdown: { allowDangerousHtml: 'yes' } }).success).toBe(false);
  });

  it('rejects a non-URL github link', () => {
    expect(configSchema.safeParse({ site: { github: 'org/repo' } }).success).toBe(false);
  });

  it('rejects a non-URL site.url', () => {
    expect(configSchema.safeParse({ site: { url: 'not a url' } }).success).toBe(false);
  });

  it('keeps ogImage/favicon as-is whether relative or absolute', () => {
    const config = configSchema.parse({
      site: { ogImage: 'og.png', favicon: 'https://cdn.example.com/icon.svg' },
    });
    expect(config.site.ogImage).toBe('og.png');
    expect(config.site.favicon).toBe('https://cdn.example.com/icon.svg');
  });

  describe('i18n', () => {
    it('defaults the parser to dot', () => {
      const config = configSchema.parse({
        i18n: { languages: ['en', 'ja'], defaultLanguage: 'en' },
      });
      expect(config.i18n?.parser).toBe('dot');
    });

    it('requires defaultLanguage to be one of languages', () => {
      const result = configSchema.safeParse({
        i18n: { languages: ['en'], defaultLanguage: 'ja' },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['i18n', 'defaultLanguage']);
    });

    it('requires at least one language', () => {
      const result = configSchema.safeParse({
        i18n: { languages: [], defaultLanguage: 'en' },
      });
      expect(result.success).toBe(false);
    });
  });
});
