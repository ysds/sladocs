import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { filesCache, getPages } from './storage.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'storage-'));
  // filesCache is module-global state; isolate each test.
  filesCache.clear();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function config() {
  return configSchema.parse({ projects: [{ dir }] });
}

describe('getPages cache', () => {
  it('serves new content after delete and recreate', async () => {
    await writeFile(path.join(dir, 'a.md'), 'old content here');
    let result = await getPages(config());
    expect(result.pages[0]?.data.content).toBe('old content here');

    await rm(path.join(dir, 'a.md'));
    await writeFile(path.join(dir, 'a.md'), 'new');
    result = await getPages(config());
    expect(result.pages[0]?.data.content).toBe('new');
  });

  it('caches parse failures until the file changes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await writeFile(path.join(dir, 'meta.json'), '{broken');
    await getPages(config());
    await getPages(config());
    // Parsed once only: the failure itself is cached.
    expect(errorSpy).toHaveBeenCalledTimes(1);

    await writeFile(path.join(dir, 'meta.json'), '{"title": "Docs!"}');
    const { metas } = await getPages(config());
    expect(metas[0]?.data.title).toBe('Docs!');
  });

  it('does not share cache entries between overlapping projects', async () => {
    await mkdir(path.join(dir, 'sub'));
    await writeFile(path.join(dir, 'sub', 'page.md'), 'hello');
    const cfg = configSchema.parse({
      projects: [
        { name: 'parent', dir },
        { name: 'child', dir: path.join(dir, 'sub') },
      ],
    });

    // Warm the cache first: an absolutePath-keyed cache only leaks entries
    // across projects on a subsequent build (both projects miss in parallel on
    // the first one). Whichever entry wins the write race, one of the two
    // assertions below catches the leak.
    await getPages(cfg);
    const { pages } = await getPages(cfg);
    expect(pages.map((p) => p.path).sort()).toEqual([
      'child/page.md',
      'parent/index.md', // synthetic tab index: parent has no root-level page
      'parent/sub/page.md',
    ]);
    expect(pages.find((p) => p.path === 'child/page.md')?.data.project.name).toBe('child');
    expect(pages.find((p) => p.path === 'parent/sub/page.md')?.data.project.name).toBe('parent');
  });
});

describe('getPages diagnostics', () => {
  it('reports a JSON syntax error as an error diagnostic', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await writeFile(path.join(dir, 'meta.json'), '{oops');
    const { diagnostics } = await getPages(config());
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ file: 'meta.json', severity: 'error' });
  });

  it('reports meta schema mismatches with the field name', async () => {
    await writeFile(path.join(dir, 'meta.json'), '{"title": 123}');
    const { diagnostics } = await getPages(config());
    expect(diagnostics[0]?.severity).toBe('error');
    expect(diagnostics[0]?.message).toContain('title');
  });

  it('keeps rendering a page whose frontmatter fails validation', async () => {
    await writeFile(path.join(dir, 'a.md'), '---\ntitle: [1, 2]\n---\nbody');
    const { pages, diagnostics } = await getPages(config());
    expect(pages).toHaveLength(1); // fail-soft: page still renders
    expect(diagnostics[0]?.severity).toBe('warning');
  });

  it('clears diagnostics once the file is fixed', async () => {
    await writeFile(path.join(dir, 'meta.json'), '{"title": 123}');
    await getPages(config());
    await writeFile(path.join(dir, 'meta.json'), '{"title": "ok!!"}');
    const { diagnostics } = await getPages(config());
    expect(diagnostics).toHaveLength(0);
  });
});

describe('getPages titles', () => {
  it('uses the frontmatter title when present', async () => {
    await writeFile(path.join(dir, 'guide.md'), '---\ntitle: Custom\n---\nbody');
    const { pages } = await getPages(config());
    expect(pages[0]?.data.title).toBe('Custom');
  });

  it('falls back to the file name without extension', async () => {
    await writeFile(path.join(dir, 'getting-started.md'), 'body');
    const { pages } = await getPages(config());
    expect(pages[0]?.data.title).toBe('getting-started');
  });

  it('uses the folder name for a nested index.md', async () => {
    await mkdir(path.join(dir, 'guide'));
    await writeFile(path.join(dir, 'guide', 'index.md'), 'body');
    const { pages } = await getPages(config());
    expect(pages[0]?.data.title).toBe('guide');
  });

  it('uses the project name for a root index.md', async () => {
    await writeFile(path.join(dir, 'index.md'), 'body');
    const cfg = configSchema.parse({ projects: [{ name: 'My Docs', dir }] });
    const { pages } = await getPages(cfg);
    expect(pages[0]?.data.title).toBe('My Docs');
  });

  it('strips a configured locale suffix from the title', async () => {
    await writeFile(path.join(dir, 'guide.ja.md'), 'body');
    const cfg = configSchema.parse({
      projects: [{ dir }],
      i18n: { languages: ['en', 'ja'], defaultLanguage: 'en' },
    });
    const { pages } = await getPages(cfg);
    expect(pages.find((p) => p.path === 'guide.ja.md')?.data.title).toBe('guide');
  });

  it('keeps dots that are not locale suffixes', async () => {
    await writeFile(path.join(dir, 'v1.2.md'), 'body');
    const cfg = configSchema.parse({
      projects: [{ dir }],
      i18n: { languages: ['en', 'ja'], defaultLanguage: 'en' },
    });
    const { pages } = await getPages(cfg);
    expect(pages[0]?.data.title).toBe('v1.2');
  });
});

describe('getPages multi-project', () => {
  it('prefixes paths with the project slug and synthesizes a root meta', async () => {
    const a = path.join(dir, 'a');
    const b = path.join(dir, 'b');
    await mkdir(a);
    await mkdir(b);
    await writeFile(path.join(a, 'page.md'), 'body');
    await writeFile(path.join(b, 'page.md'), 'body');
    const cfg = configSchema.parse({
      projects: [
        { name: 'Alpha', dir: a },
        { name: 'Beta', dir: b },
      ],
    });

    const { pages, metas } = await getPages(cfg);
    expect(pages.map((p) => p.path).sort()).toEqual(['alpha/page.md', 'beta/page.md']);
    expect(metas.find((m) => m.path === 'alpha/meta.json')?.data).toMatchObject({
      root: true,
      title: 'Alpha',
    });
  });

  it('synthesizes an index page when no page sits at the project root', async () => {
    const a = path.join(dir, 'a');
    const b = path.join(dir, 'b');
    await mkdir(path.join(a, 'sub'), { recursive: true });
    await mkdir(b);
    await writeFile(path.join(a, 'sub', 'page.md'), 'body');
    await writeFile(path.join(b, 'page.md'), 'body');
    const cfg = configSchema.parse({
      projects: [
        { name: 'Alpha', dir: a },
        { name: 'Beta', dir: b },
      ],
    });

    const { pages } = await getPages(cfg);
    const index = pages.find((p) => p.path === 'alpha/index.md');
    expect(index?.data.index).toBe(true);
    expect(index?.data.title).toBe('Alpha');
  });
});
