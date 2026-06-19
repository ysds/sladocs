import { describe, expect, it } from 'vitest';
import { configSchema } from './schema.js';

describe('configSchema', () => {
  it('applies defaults to an empty config', () => {
    const config = configSchema.parse({});
    expect(config.site).toEqual({ title: 'sladocs' });
    expect(config.markdown).toEqual({ allowDangerousHtml: 'safe' });
    expect(config.frontmatter).toEqual({});
    expect(config.color).toEqual({});
    expect(config.projects).toBeUndefined();
    expect(config.exclude).toBeUndefined();
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

  describe('exclude', () => {
    it('accepts a top-level exclude array', () => {
      const config = configSchema.parse({ exclude: ['**/CLAUDE.md', '**/_template.md'] });
      expect(config.exclude).toEqual(['**/CLAUDE.md', '**/_template.md']);
    });

    it('defaults to undefined when omitted', () => {
      expect(configSchema.parse({}).exclude).toBeUndefined();
    });
  });

  describe('frontmatter', () => {
    it('defaults to empty when omitted', () => {
      expect(configSchema.parse({}).frontmatter).toEqual({});
    });

    it('accepts a display array', () => {
      const config = configSchema.parse({
        frontmatter: {
          display: [
            { key: 'status', label: 'Status', badge: true },
            { key: 'owner', label: 'Owner' },
          ],
        },
      });
      expect(config.frontmatter.display).toHaveLength(2);
      expect(config.frontmatter.display![0]).toEqual({ key: 'status', label: 'Status', badge: true });
      expect(config.frontmatter.display![1]).toEqual({ key: 'owner', label: 'Owner' });
    });

    it('rejects a field without key or label', () => {
      expect(
        configSchema.safeParse({ frontmatter: { display: [{ key: 'x' }] } }).success,
      ).toBe(false);
      expect(
        configSchema.safeParse({ frontmatter: { display: [{ label: 'X' }] } }).success,
      ).toBe(false);
    });
  });
});
