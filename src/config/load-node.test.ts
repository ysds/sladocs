import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseConfig } from './load-node.js';

describe('parseConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws on an invalid config', () => {
    expect(() => parseConfig('sladocs.json', { site: { url: 'nope' } })).toThrow(/invalid/);
  });

  it('warns when a relative ogImage is set without site.url', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseConfig('sladocs.json', { site: { ogImage: 'og.png' } });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('site.url is missing');
  });

  it('does not warn when ogImage is an absolute URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseConfig('sladocs.json', { site: { ogImage: 'https://cdn.example.com/og.png' } });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when site.url is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseConfig('sladocs.json', { site: { ogImage: 'og.png', url: 'https://example.com' } });
    expect(warn).not.toHaveBeenCalled();
  });
});
