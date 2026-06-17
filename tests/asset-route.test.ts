import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { GET } from '@/pages/_api/api/asset/[...path].js';

vi.mock('@/config/load-runtime.js', () => ({
  getConfigRuntime: vi.fn(),
}));

let dir: string;

beforeEach(async () => {
  // mkdtemp returns a fresh dir per test, so the route's per-dir caches
  // (ignore matcher, real project dir) never leak between tests.
  dir = await mkdtemp(path.join(tmpdir(), 'asset-route-'));
  await mkdir(path.join(dir, 'images'));
  await writeFile(path.join(dir, 'images', 'logo.png'), 'png-bytes');
  vi.mocked(getConfigRuntime).mockResolvedValue(
    configSchema.parse({ projects: [{ name: 'docs', dir, exclude: ['secret'] }] }),
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function get(assetPath: string) {
  return GET(new Request(`http://test/api/asset/docs/${assetPath}`));
}

describe('asset route realpath checks', () => {
  it('serves a normal file inside the project', async () => {
    const res = await get('images/logo.png');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('png-bytes');
  });

  it('serves an in-project symlink', async () => {
    await symlink(path.join(dir, 'images', 'logo.png'), path.join(dir, 'alias.png'));
    const res = await get('alias.png');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('png-bytes');
  });

  it('rejects a symlink escaping the project with 404', async () => {
    await symlink('/etc', path.join(dir, 'escape'));
    expect((await get('escape/hosts')).status).toBe(404);
  });

  it('rejects a symlink to an excluded file with 404', async () => {
    await mkdir(path.join(dir, 'secret'));
    await writeFile(path.join(dir, 'secret', 'key.txt'), 'shh');
    await symlink(path.join(dir, 'secret', 'key.txt'), path.join(dir, 'leak.txt'));
    expect((await get('secret/key.txt')).status).toBe(404); // direct: already covered
    expect((await get('leak.txt')).status).toBe(404); // via symlink: the new check
  });

  it('rejects a symlink to a dotfile with 404', async () => {
    await writeFile(path.join(dir, '.env'), 'TOKEN=x');
    await symlink(path.join(dir, '.env'), path.join(dir, 'env.txt'));
    expect((await get('env.txt')).status).toBe(404);
  });

  it('keeps rejecting .git contents, including case variants (regression)', async () => {
    await mkdir(path.join(dir, '.git'));
    await writeFile(path.join(dir, '.git', 'config'), '[core]');
    expect((await get('.git/config')).status).toBe(404);
    expect((await get('.GIT/config')).status).toBe(404);
  });
});

describe('asset route', () => {
  it('sets the content type from the extension', async () => {
    const res = await get('images/logo.png');
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('answers 404 for an unknown project slug', async () => {
    const res = await GET(new Request('http://test/api/asset/nope/images/logo.png'));
    expect(res.status).toBe(404);
  });

  it('answers 404 (not 400/403) for traversal segments', async () => {
    // waku params can carry raw segments that URL normalization would strip.
    const res = await GET(new Request('http://test/api/asset/x'), {
      params: { path: ['docs', '..', '..', 'secret.txt'] },
    });
    expect(res.status).toBe(404);
  });

  it('answers 404 for an excluded file', async () => {
    await mkdir(path.join(dir, 'secret'), { recursive: true });
    await writeFile(path.join(dir, 'secret', 'key.txt'), 'shh');
    expect((await get('secret/key.txt')).status).toBe(404);
  });

  it('answers 404 for a dotfile', async () => {
    await writeFile(path.join(dir, '.env'), 'TOKEN=x');
    expect((await get('.env')).status).toBe(404);
  });

  it('answers 404 for a missing file', async () => {
    expect((await get('images/nope.png')).status).toBe(404);
  });
});
