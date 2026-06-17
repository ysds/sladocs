import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import ignore from 'ignore';

const exec = promisify(execFile);

// Patterns always excluded when the directory is not a git repository,
// so that node_modules never leaks into the site even without git.
export const FALLBACK_IGNORE = ['**/node_modules/**'];

// Ask git for everything it ignores under `dir`, relative to `dir`.
// `--directory` collapses fully-ignored directories to a single entry.
// `-z` (NUL-separated) keeps non-ASCII names literal — without it git
// quote-escapes them and they never match the real paths.
// Returns null when `dir` is not inside a git repository (or git is absent),
// signalling callers to fall back to FALLBACK_IGNORE.
export async function getGitIgnoredPaths(dir: string): Promise<string[] | null> {
  try {
    const { stdout } = await exec(
      'git',
      ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
      { cwd: dir, maxBuffer: 1024 * 1024 * 16 },
    );
    // Drop './': git reports it when `dir` itself is ignored, but an
    // explicitly previewed directory must not exclude its own contents.
    return stdout.split('\0').filter((line) => line && line !== './');
  } catch {
    return null;
  }
}

// tinyglobby ignore patterns for a project: git-ignored paths plus the user's
// own exclude list, falling back to FALLBACK_IGNORE outside a git repo.
export async function gitIgnoreGlobs(
  dir: string,
  exclude: string[],
): Promise<string[]> {
  const gitIgnored = await getGitIgnoredPaths(dir);
  return [...(gitIgnored ?? FALLBACK_IGNORE), ...exclude];
}

// Matcher over absolute paths: true when the path is excluded from the site
// (git-ignored or in the user's exclude list, falling back to FALLBACK_IGNORE
// outside a git repo). `.git/` is matched explicitly — git never reports its
// own directory as ignored — and case-insensitively, since on APFS/NTFS a
// requested `.GIT/config` opens the real `.git/config`. Paths outside `dir`
// ('..'-leading or absolute after relativizing) are not this project's business
// and match false.
export async function createIgnoreMatcher(
  dir: string,
  exclude: string[],
): Promise<(absPath: string) => boolean> {
  const gitIgnored = await getGitIgnoredPaths(dir);
  const ig = ignore().add(gitIgnored ?? FALLBACK_IGNORE).add(exclude);
  return (absPath) => {
    const relPath = path.relative(dir, absPath);
    if (relPath === '' || !ignore.isPathValid(relPath)) return false;
    if (relPath.split(path.sep)[0]?.toLowerCase() === '.git') return true;
    return ig.ignores(relPath);
  };
}
