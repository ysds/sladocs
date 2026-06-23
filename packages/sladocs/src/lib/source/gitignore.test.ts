import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FALLBACK_IGNORE,
  createIgnoreMatcher,
  getGitIgnoredPaths,
  gitIgnoreGlobs,
} from './gitignore.js';

const exec = promisify(execFile);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'gitignore-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function gitInit(cwd = dir) {
  return exec('git', ['init', '-q'], { cwd });
}

describe('getGitIgnoredPaths', () => {
  it('lists ignored paths relative to dir, collapsing ignored directories', async () => {
    await gitInit();
    await writeFile(path.join(dir, '.gitignore'), 'dist/\n*.log\n');
    await mkdir(path.join(dir, 'dist'));
    await writeFile(path.join(dir, 'dist', 'bundle.js'), '');
    await writeFile(path.join(dir, 'debug.log'), '');
    await writeFile(path.join(dir, 'page.md'), '');

    const paths = await getGitIgnoredPaths(dir);
    expect(paths).toContain('dist/');
    expect(paths).toContain('debug.log');
    expect(paths).not.toContain('page.md');
  });

  it('returns null outside a git repository', async () => {
    expect(await getGitIgnoredPaths(dir)).toBeNull();
  });

  it("drops './' when the previewed dir itself is ignored", async () => {
    await gitInit();
    await writeFile(path.join(dir, '.gitignore'), 'docs/\n');
    const docs = path.join(dir, 'docs');
    await mkdir(docs);
    await writeFile(path.join(docs, 'page.md'), '');

    const paths = await getGitIgnoredPaths(docs);
    expect(paths).not.toContain('./');
  });
});

describe('gitIgnoreGlobs', () => {
  it('falls back to FALLBACK_IGNORE plus exclude outside a git repo', async () => {
    expect(await gitIgnoreGlobs(dir, ['drafts/**'])).toEqual([...FALLBACK_IGNORE, 'drafts/**']);
  });
});

describe('createIgnoreMatcher', () => {
  it('matches git-ignored paths by absolute path', async () => {
    await gitInit();
    await writeFile(path.join(dir, '.gitignore'), 'dist/\n');
    await mkdir(path.join(dir, 'dist'));
    await writeFile(path.join(dir, 'dist', 'bundle.js'), '');

    const matcher = await createIgnoreMatcher(dir, []);
    expect(matcher(path.join(dir, 'dist', 'bundle.js'))).toBe(true);
    expect(matcher(path.join(dir, 'page.md'))).toBe(false);
  });

  it('always rejects .git contents, case-insensitively, even outside a repo', async () => {
    const matcher = await createIgnoreMatcher(dir, []);
    expect(matcher(path.join(dir, '.git', 'config'))).toBe(true);
    expect(matcher(path.join(dir, '.GIT', 'config'))).toBe(true);
  });

  it('applies the user exclude list', async () => {
    const matcher = await createIgnoreMatcher(dir, ['drafts']);
    expect(matcher(path.join(dir, 'drafts', 'wip.md'))).toBe(true);
  });

  it('does not claim paths outside dir', async () => {
    const matcher = await createIgnoreMatcher(dir, []);
    expect(matcher('/somewhere/else.md')).toBe(false);
    expect(matcher(dir)).toBe(false);
  });
});
