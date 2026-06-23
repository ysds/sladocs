import { describe, expect, it } from 'vitest';
import { normalizeBasePath } from '@/lib/static/base-path.js';

describe('normalizeBasePath', () => {
  it('returns root unchanged', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(normalizeBasePath(undefined)).toBe('/');
    expect(normalizeBasePath('')).toBe('/');
  });

  it('adds leading and trailing slashes', () => {
    expect(normalizeBasePath('repo')).toBe('/repo/');
    expect(normalizeBasePath('/repo')).toBe('/repo/');
    expect(normalizeBasePath('repo/')).toBe('/repo/');
    expect(normalizeBasePath('/repo/')).toBe('/repo/');
  });

  it('handles nested paths', () => {
    expect(normalizeBasePath('org/repo')).toBe('/org/repo/');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizeBasePath('//repo//sub//')).toBe('/repo/sub/');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeBasePath('  /repo/  ')).toBe('/repo/');
  });
});
