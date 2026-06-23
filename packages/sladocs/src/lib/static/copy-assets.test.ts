import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { copyAssets } from '@/lib/static/copy-assets.js';

vi.mock('@/config/load-runtime.js', () => ({
  getConfigRuntime: vi.fn(),
}));

let dir: string;
let out: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'copy-assets-src-'));
  out = await mkdtemp(path.join(tmpdir(), 'copy-assets-out-'));
  await mkdir(path.join(dir, 'images'), { recursive: true });
  await writeFile(path.join(dir, 'index.md'), '# Home');
  await writeFile(path.join(dir, 'meta.json'), '{}');
  await writeFile(path.join(dir, 'images', 'logo.svg'), '<svg/>');
  await writeFile(path.join(dir, 'data.json'), '{"x":1}');
  await writeFile(path.join(dir, '.env'), 'SECRET=1');
  vi.mocked(getConfigRuntime).mockResolvedValue(
    configSchema.parse({ projects: [{ name: 'docs', dir }] }),
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(out, { recursive: true, force: true });
});

const assetPath = (...p: string[]) => path.join(out, 'api', 'asset', 'docs', ...p);

describe('copyAssets', () => {
  it('copies non-markdown assets under api/asset/<slug>', async () => {
    const count = await copyAssets(out);
    expect(existsSync(assetPath('images', 'logo.svg'))).toBe(true);
    expect(existsSync(assetPath('data.json'))).toBe(true);
    expect(await readFile(assetPath('images', 'logo.svg'), 'utf-8')).toBe('<svg/>');
    expect(count).toBe(2);
  });

  it('skips markdown, meta.json and dotfiles', async () => {
    await copyAssets(out);
    expect(existsSync(assetPath('index.md'))).toBe(false);
    expect(existsSync(assetPath('meta.json'))).toBe(false);
    expect(existsSync(assetPath('.env'))).toBe(false);
  });

  it('skips .mdx sources', async () => {
    await writeFile(path.join(dir, 'page.mdx'), '# MDX');
    await copyAssets(out);
    expect(existsSync(assetPath('page.mdx'))).toBe(false);
  });

  it('prunes node_modules (fallback ignore)', async () => {
    await mkdir(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'x');
    await copyAssets(out);
    expect(existsSync(assetPath('node_modules', 'pkg', 'index.js'))).toBe(false);
  });
});
