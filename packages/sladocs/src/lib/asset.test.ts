import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, mimeFor, resolveAsset, withBase } from './asset.js';
import type { NormalizedProjectConfig } from '@/lib/source/config.js';

const project: NormalizedProjectConfig = {
  name: 'Docs',
  slug: 'docs',
  dir: '/proj/docs',
  include: [],
  exclude: [],
};

describe('mimeFor', () => {
  it('returns the mime type for known extensions', () => {
    expect(mimeFor('a.png')).toBe('image/png');
    expect(mimeFor('a.svg')).toBe('image/svg+xml');
    expect(mimeFor('a.json')).toBe('application/json; charset=utf-8');
  });

  it('is case-insensitive', () => {
    expect(mimeFor('PHOTO.JPG')).toBe('image/jpeg');
  });

  it('falls back to octet-stream for unknown or missing extensions', () => {
    expect(mimeFor('a.xyz')).toBe('application/octet-stream');
    expect(mimeFor('noext')).toBe('application/octet-stream');
  });

  it('maps media and document extensions', () => {
    expect(mimeFor('clip.mp4')).toBe('video/mp4');
    expect(mimeFor('clip.webm')).toBe('video/webm');
    expect(mimeFor('clip.mov')).toBe('video/quicktime');
    expect(mimeFor('song.mp3')).toBe('audio/mpeg');
    expect(mimeFor('song.wav')).toBe('audio/wav');
    expect(mimeFor('song.m4a')).toBe('audio/mp4');
    expect(mimeFor('song.ogg')).toBe('audio/ogg');
    expect(mimeFor('song.flac')).toBe('audio/flac');
    expect(mimeFor('anim.apng')).toBe('image/apng');
    expect(mimeFor('data.xml')).toBe('application/xml');
    expect(mimeFor('conf.yaml')).toBe('text/yaml; charset=utf-8');
    expect(mimeFor('conf.yml')).toBe('text/yaml; charset=utf-8');
    expect(mimeFor('readme.md')).toBe('text/markdown; charset=utf-8');
    expect(mimeFor('readme.mdx')).toBe('text/markdown; charset=utf-8');
  });
});

describe('assetUrl', () => {
  it('resolves a reference relative to the page directory', () => {
    expect(assetUrl(project, '/proj/docs/guide/page.md', './img/a.png')).toBe(
      '/api/asset/docs/guide/img/a.png',
    );
  });

  it('resolves parent references inside the project', () => {
    expect(assetUrl(project, '/proj/docs/guide/page.md', '../shared.png')).toBe(
      '/api/asset/docs/shared.png',
    );
  });

  it('encodes each path segment', () => {
    expect(assetUrl(project, '/proj/docs/page.md', './my pic.png')).toBe(
      '/api/asset/docs/my%20pic.png',
    );
    expect(assetUrl(project, '/proj/docs/page.md', './画像/図.png')).toBe(
      `/api/asset/docs/${encodeURIComponent('画像')}/${encodeURIComponent('図.png')}`,
    );
  });

  describe('with a static base path', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('prefixes the base path, collapsing the trailing slash', () => {
      vi.stubEnv('SLADOCS_BASE_PATH', '/repo/');
      // basePrefix strips the trailing slash so the URL is not /repo//api/...
      expect(assetUrl(project, '/proj/docs/page.md', './a.png')).toBe(
        '/repo/api/asset/docs/a.png',
      );
    });

    it('treats root (/) as no prefix', () => {
      vi.stubEnv('SLADOCS_BASE_PATH', '/');
      expect(assetUrl(project, '/proj/docs/page.md', './a.png')).toBe(
        '/api/asset/docs/a.png',
      );
    });
  });
});

describe('withBase', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is a no-op when no base path is set', () => {
    expect(withBase('/guide/x')).toBe('/guide/x');
  });

  it('prefixes root-relative urls with the base path', () => {
    vi.stubEnv('SLADOCS_BASE_PATH', '/repo/');
    expect(withBase('/guide/x')).toBe('/repo/guide/x');
  });

  it('leaves absolute and non-root-relative urls untouched', () => {
    vi.stubEnv('SLADOCS_BASE_PATH', '/repo/');
    expect(withBase('https://example.com/y')).toBe('https://example.com/y');
    expect(withBase('rel/x')).toBe('rel/x');
  });
});

describe('resolveAsset', () => {
  it('resolves segments to an absolute path under the project dir', () => {
    expect(resolveAsset(project, ['guide', 'a.png'])).toBe('/proj/docs/guide/a.png');
  });

  it('decodes URL-encoded segments', () => {
    expect(resolveAsset(project, ['my%20pic.png'])).toBe('/proj/docs/my pic.png');
  });

  it('rejects traversal outside the project dir', () => {
    expect(resolveAsset(project, ['..', 'secret.txt'])).toBeNull();
    expect(resolveAsset(project, ['a', '..', '..', 'b.png'])).toBeNull();
  });

  it('rejects encoded traversal', () => {
    expect(resolveAsset(project, ['%2e%2e', 'secret.txt'])).toBeNull();
  });

  it('rejects absolute path injection', () => {
    expect(resolveAsset(project, ['', 'etc', 'passwd'])).toBeNull();
    expect(resolveAsset(project, ['/etc/passwd'])).toBeNull();
  });

  it('resolves the project dir itself (reading it fails downstream)', () => {
    expect(resolveAsset(project, ['..', 'docs'])).toBe('/proj/docs');
  });

  it('never serves dotfiles', () => {
    expect(resolveAsset(project, ['.env'])).toBeNull();
    expect(resolveAsset(project, ['sub', '.htpasswd'])).toBeNull();
  });

  it('keeps files under dot-directories reachable', () => {
    expect(resolveAsset(project, ['.github', 'logo.png'])).toBe('/proj/docs/.github/logo.png');
  });
});
