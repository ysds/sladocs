import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { getSource } from '@/lib/source/index.js';
import { filesCache } from '@/lib/source/storage.js';

vi.mock('@/config/load-runtime.js', () => ({
  getConfigRuntime: vi.fn(),
}));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'static-cfg-'));
  filesCache.clear();
  getSource.revalidate(false);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe('[...slugs] getConfig', () => {
  it('returns dynamic when SLADOCS_STATIC is unset', async () => {
    vi.stubEnv('SLADOCS_STATIC', '');
    vi.mocked(getConfigRuntime).mockResolvedValue(configSchema.parse({ projects: [{ dir }] }));
    const { getConfig } = await import('@/pages/[...slugs].js');
    const config = await getConfig();
    expect(config.render).toBe('dynamic');
  });

  it('returns static with paths when SLADOCS_STATIC=1', async () => {
    vi.stubEnv('SLADOCS_STATIC', '1');
    await writeFile(path.join(dir, 'guide.md'), '# Guide\n');
    await writeFile(path.join(dir, 'api.md'), '# API\n');
    vi.mocked(getConfigRuntime).mockResolvedValue(configSchema.parse({ projects: [{ dir }] }));
    const { getConfig } = await import('@/pages/[...slugs].js');
    const config = await getConfig();
    expect(config.render).toBe('static');
    expect(config).toHaveProperty('staticPaths');
    const paths = (config as { staticPaths: string[][] }).staticPaths;
    expect(paths).toContainEqual([]);
    expect(paths).toContainEqual(['guide']);
    expect(paths).toContainEqual(['api']);
  });

  it('includes i18n locale-prefixed paths', async () => {
    vi.stubEnv('SLADOCS_STATIC', '1');
    await writeFile(path.join(dir, 'guide.md'), '# Guide\n');
    vi.mocked(getConfigRuntime).mockResolvedValue(
      configSchema.parse({
        projects: [{ dir }],
        i18n: { languages: ['en', 'ja'], defaultLanguage: 'en' },
      }),
    );
    const { getConfig } = await import('@/pages/[...slugs].js');
    const config = await getConfig();
    const paths = (config as { staticPaths: string[][] }).staticPaths;
    expect(paths).toContainEqual(['guide']);
    expect(paths).toContainEqual(['ja', 'guide']);
    expect(paths).toContainEqual(['ja']);
  });
});

describe('search getConfig', () => {
  it('returns dynamic when SLADOCS_STATIC is unset', async () => {
    vi.stubEnv('SLADOCS_STATIC', '');
    const { getConfig } = await import('@/pages/_api/api/search.js');
    const config = await getConfig();
    expect(config.render).toBe('dynamic');
  });

  it('returns static when SLADOCS_STATIC=1', async () => {
    vi.stubEnv('SLADOCS_STATIC', '1');
    const { getConfig } = await import('@/pages/_api/api/search.js');
    const config = await getConfig();
    expect(config.render).toBe('static');
  });
});

describe('search GET in static mode', () => {
  it('returns staticGET response when SLADOCS_STATIC=1', async () => {
    vi.stubEnv('SLADOCS_STATIC', '1');
    await writeFile(path.join(dir, 'hello.md'), '# Hello\n\nWorld content.\n');
    vi.mocked(getConfigRuntime).mockResolvedValue(configSchema.parse({ projects: [{ dir }] }));
    const { GET } = await import('@/pages/_api/api/search.js');
    const res = await GET(new Request('http://test/api/search'));
    expect(res.status).toBe(200);
    // staticGET returns the full index as JSON, not search results
    const body = await res.json();
    expect(body).toBeDefined();
  });
});
