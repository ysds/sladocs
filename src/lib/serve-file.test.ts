import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serveFile } from './serve-file.js';

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'serve-file-'));
  file = path.join(dir, 'hello.txt');
  await writeFile(file, 'hello world'); // 11 bytes
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function get(headers: Record<string, string> = {}) {
  return serveFile(new Request('http://test/x', { headers }), file);
}

describe('serveFile', () => {
  it('serves the full file with caching headers', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello world');
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('content-length')).toBe('11');
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('etag')).toMatch(/^W\/".+"$/);
    expect(res.headers.get('last-modified')).toBeTruthy();
  });

  it('returns 404 for a missing file or a directory', async () => {
    const missing = await serveFile(new Request('http://test/x'), path.join(dir, 'nope'));
    expect(missing.status).toBe(404);
    const directory = await serveFile(new Request('http://test/x'), dir);
    expect(directory.status).toBe(404);
  });

  it('answers 304 when If-None-Match matches', async () => {
    const etag = (await get()).headers.get('etag')!;
    const res = await get({ 'if-none-match': etag });
    expect(res.status).toBe(304);
    expect(await res.text()).toBe('');
  });

  it('answers 304 when If-Modified-Since is at or after mtime', async () => {
    const lastModified = (await get()).headers.get('last-modified')!;
    const res = await get({ 'if-modified-since': lastModified });
    expect(res.status).toBe(304);
  });

  it('serves new content with a new ETag after the file changes', async () => {
    const etag = (await get()).headers.get('etag')!;
    await writeFile(file, 'hello brave new world'); // different size
    const res = await get({ 'if-none-match': etag });
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).not.toBe(etag);
    expect(await res.text()).toBe('hello brave new world');
  });

  it('serves a single range with 206', async () => {
    const res = await get({ range: 'bytes=0-4' });
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('hello');
    expect(res.headers.get('content-range')).toBe('bytes 0-4/11');
    expect(res.headers.get('content-length')).toBe('5');
  });

  it('serves an open-ended range to the end of the file', async () => {
    const res = await get({ range: 'bytes=6-' });
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('world');
  });

  it('serves a suffix range', async () => {
    const res = await get({ range: 'bytes=-5' });
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('world');
    expect(res.headers.get('content-range')).toBe('bytes 6-10/11');
  });

  it('clamps a range end past EOF', async () => {
    const res = await get({ range: 'bytes=6-999' });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 6-10/11');
  });

  it('answers 416 for an unsatisfiable range', async () => {
    const res = await get({ range: 'bytes=999-' });
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */11');
  });

  it('ignores multi-range requests and serves the whole file', async () => {
    const res = await get({ range: 'bytes=0-1,3-4' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello world');
  });
});
