import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { computeStaticPaths } from '@/lib/source/static-paths.js';

vi.mock('@/config/load-runtime.js', () => ({
  getConfigRuntime: vi.fn(),
}));

let dir: string;
const origRoot = process.env.ROOT_DIR;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'static-paths-'));
  process.env.ROOT_DIR = dir;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  process.env.ROOT_DIR = origRoot;
});

// Compare as sorted joined strings so the Set's order does not matter.
const norm = (paths: string[][]) => paths.map((p) => p.join('/')).sort();

describe('computeStaticPaths (single project, no i18n)', () => {
  it('enumerates the root and every page', async () => {
    await writeFile(path.join(dir, 'index.md'), '# Home');
    await mkdir(path.join(dir, 'guide'));
    await writeFile(path.join(dir, 'guide', 'setup.md'), '# Setup');
    vi.mocked(getConfigRuntime).mockResolvedValue(
      configSchema.parse({ projects: [{ name: 'docs', dir }] }),
    );

    const paths = norm(await computeStaticPaths());
    expect(paths).toContain(''); // root listing -> []
    expect(paths).toContain('guide/setup');
  });
});

describe('computeStaticPaths (i18n, dot parser)', () => {
  it('emits per-locale roots and locale-prefixed page urls', async () => {
    await writeFile(path.join(dir, 'index.md'), '# Home');
    await writeFile(path.join(dir, 'guide.md'), '# Guide EN');
    await writeFile(path.join(dir, 'guide.ja.md'), '# Guide JA');
    vi.mocked(getConfigRuntime).mockResolvedValue(
      configSchema.parse({
        projects: [{ name: 'docs', dir }],
        i18n: { languages: ['en', 'ja'], defaultLanguage: 'en', parser: 'dot' },
      }),
    );

    const paths = norm(await computeStaticPaths());
    // default-language root has no prefix; ja root is ['ja']
    expect(paths).toContain('');
    expect(paths).toContain('ja');
    // default language pages carry no prefix; ja pages are prefixed
    expect(paths).toContain('guide');
    expect(paths).toContain('ja/guide');
    // the locale suffix must not leak into the slug
    expect(paths).not.toContain('guide.ja');
  });
});
