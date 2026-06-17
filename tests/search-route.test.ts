import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { getSource } from '@/lib/source/index.js';
import { filesCache } from '@/lib/source/storage.js';
import { GET } from '@/pages/_api/api/search.js';

vi.mock('@/config/load-runtime.js', () => ({
  getConfigRuntime: vi.fn(),
}));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'search-'));
  // getSource and filesCache are module-global; isolate each test.
  filesCache.clear();
  getSource.revalidate(false);
  vi.mocked(getConfigRuntime).mockResolvedValue(configSchema.parse({ projects: [{ dir }] }));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('search API', () => {
  it('returns hits for a matching query', async () => {
    await writeFile(path.join(dir, 'animals.md'), '# Animals\n\nThe quick zebra jumps.\n');
    const res = await GET(new Request('http://test/api/search?query=zebra'));
    expect(res.status).toBe(200);
    const hits = await res.json();
    expect(JSON.stringify(hits)).toContain('/animals');
  });

  it('returns an empty list without a query', async () => {
    const res = await GET(new Request('http://test/api/search'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
