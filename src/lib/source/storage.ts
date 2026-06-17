import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'tinyglobby';
import { z } from 'zod';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { type NormalizedProjectConfig, normalizeProjects } from './config.js';
import { gitIgnoreGlobs } from './gitignore.js';
import type { I18nConfig, ParsedAppConfig } from '@/config/schema.js';

// `guide.ja.md` -> `guide` when `ja` is a configured language. The loader's dot
// parser strips the locale from the file *path*, but the title fallback derives
// from the base name, so we strip it here too. Only known locales are removed,
// leaving filenames that merely contain dots (`v1.2.md`) untouched.
function stripLocaleSuffix(base: string, i18n: I18nConfig | undefined): string {
  if (!i18n) return base;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return base;
  const suffix = base.slice(dot + 1);
  return i18n.languages.includes(suffix) ? base.slice(0, dot) : base;
}

// Title fallback when a page has no frontmatter title. fumadocs uses a folder's
// `index` page name as the folder's tree label, so a bare `index.md` would make
// its folder show up as "Index". Fall back to the containing folder name instead
// (project name for a root-level index).
function titleFromPath(
  file: string,
  i18n: I18nConfig | undefined,
  projectName: string,
): string {
  const base = stripLocaleSuffix(path.basename(file, path.extname(file)), i18n);
  if (base !== 'index') return base;
  const dir = path.dirname(file);
  return dir === '.' ? projectName : path.basename(dir);
}

export interface RawPage {
  type: 'page';
  path: string;
  absolutePath: string;
  data: {
    title: string;
    description?: string;
    icon?: string;
    content: string;
    frontmatter: Record<string, unknown>;
    project: NormalizedProjectConfig;
    // Synthetic index of a project tab that has no real page directly under its
    // root; it renders a list of the project's pages.
    index?: boolean;
  };
}

export interface RawMeta {
  type: 'meta';
  path: string;
  absolutePath: string;
  data: { title?: string; description?: string } & Record<string, unknown>;
}

type Built = RawPage | RawMeta | undefined;

export interface SourceDiagnostic {
  // Project-relative path, prefixed with the project slug in multi-project mode.
  file: string;
  absolutePath: string;
  severity: 'error' | 'warning';
  message: string;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  value: RawPage | RawMeta | undefined;
  // Cached alongside the value: fixing the file changes its mtime, which
  // rebuilds the entry and clears the diagnostics automatically.
  diagnostics: SourceDiagnostic[];
}

// Keyed by `${project.dir}\0${file}`: the same absolute path can belong to two
// overlapping projects with different relative paths and project configs.
export const filesCache = new Map<string, CacheEntry>();

function cacheKey(project: NormalizedProjectConfig, file: string): string {
  return `${project.dir}\0${file}`;
}

export async function getPages(
  config: ParsedAppConfig,
): Promise<{ pages: RawPage[]; metas: RawMeta[]; diagnostics: SourceDiagnostic[] }> {
  const projects = normalizeProjects(config);
  const multi = projects.length > 1;
  const built = await Promise.all(projects.map((p) => buildProject(p, config.i18n)));

  const pages: RawPage[] = [];
  const metas: RawMeta[] = [];
  const diagnostics: SourceDiagnostic[] = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i]!;
    const result = built[i]!;
    const prefix = multi ? `${project.slug}/` : '';

    for (const d of result.diagnostics) {
      diagnostics.push({ ...d, file: prefix + d.file });
    }

    let rootMeta: RawMeta | undefined;
    for (const meta of result.metas) {
      const prefixed: RawMeta = { ...meta, path: prefix + meta.path };
      if (multi && meta.path === 'meta.json') {
        rootMeta = { ...prefixed, data: { ...meta.data, root: true, title: meta.data.title ?? project.name } };
        metas.push(rootMeta);
      } else {
        metas.push(prefixed);
      }
    }
    if (multi && !rootMeta) {
      metas.push({
        type: 'meta',
        path: `${project.slug}/meta.json`,
        absolutePath: path.join(project.dir, 'meta.json'),
        data: { root: true, title: project.name },
      });
    }

    for (const page of result.pages) {
      pages.push({ ...page, path: prefix + page.path });
    }

    // A project becomes a layout tab only if its root folder exposes a page
    // directly (fumadocs derives the tab url from the root's index or a direct
    // child page). When every page lives in a subdirectory, synthesize an index
    // that lists the project's pages so the tab shows up.
    if (multi && result.pages.length > 0 && !result.pages.some((p) => !p.path.includes('/'))) {
      pages.push({
        type: 'page',
        path: `${project.slug}/index.md`,
        absolutePath: path.join(project.dir, 'index.md'),
        data: {
          title: project.name,
          content: '',
          frontmatter: {},
          project,
          index: true,
        },
      });
    }
  }

  return { pages, metas, diagnostics };
}

async function buildProject(project: NormalizedProjectConfig, i18n: I18nConfig | undefined) {
  const files = await glob(project.include, {
    cwd: project.dir,
    ignore: await gitIgnoreGlobs(project.dir, project.exclude),
  });
  const built = await Promise.all(files.map((file) => buildFile(project, file, i18n)));

  const pages: RawPage[] = [];
  const metas: RawMeta[] = [];
  const diagnostics: SourceDiagnostic[] = [];
  for (const item of built) {
    diagnostics.push(...item.diagnostics);
    if (!item.value) continue;
    if (item.value.type === 'page') pages.push(item.value);
    else metas.push(item.value);
  }
  return { pages, metas, diagnostics };
}

async function buildFile(
  project: NormalizedProjectConfig,
  file: string,
  i18n: I18nConfig | undefined,
): Promise<{ value: Built; diagnostics: SourceDiagnostic[] }> {
  const absolutePath = path.resolve(project.dir, file);
  const key = cacheKey(project, file);

  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    filesCache.delete(key);
    return { value: undefined, diagnostics: [] };
  }

  const cached = filesCache.get(key);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached;
  }

  const diagnostics: SourceDiagnostic[] = [];
  let value: Built;
  try {
    switch (path.extname(file)) {
      case '.json':
        value = await readMeta(absolutePath, file, diagnostics);
        break;
      case '.md':
      case '.mdx':
        value = await readPage(project, absolutePath, file, i18n, diagnostics);
        break;
    }
  } catch (e) {
    console.error(`error parsing ${file}`, e);
    diagnostics.push({
      file,
      absolutePath,
      severity: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
  // Failures are cached too (value: undefined) so a broken file is not
  // re-parsed on every build; an mtime/size change retries automatically.
  const entry: CacheEntry = { mtimeMs: stat.mtimeMs, size: stat.size, value, diagnostics };
  filesCache.set(key, entry);
  return entry;
}

async function readPage(
  project: NormalizedProjectConfig,
  absolutePath: string,
  file: string,
  i18n: I18nConfig | undefined,
  diagnostics: SourceDiagnostic[],
): Promise<RawPage> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = parseFrontmatter(content);
  const result = pageSchema.partial().loose().safeParse(parsed.data);
  // Fail-soft: render the page with empty frontmatter, but surface the issue.
  const frontmatter = result.data ?? {};
  if (result.error) {
    diagnostics.push({
      file,
      absolutePath,
      severity: 'warning',
      message: `frontmatter: ${z.prettifyError(result.error)}`,
    });
  }

  return {
    type: 'page',
    path: file,
    absolutePath,
    data: {
      title: frontmatter.title ?? titleFromPath(file, i18n, project.name),
      description: frontmatter.description,
      icon: frontmatter.icon,
      content: parsed.content,
      frontmatter,
      project,
    },
  };
}

async function readMeta(
  absolutePath: string,
  file: string,
  diagnostics: SourceDiagnostic[],
): Promise<RawMeta | undefined> {
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content);
  const result = metaSchema.loose().safeParse(parsed);
  if (result.error) {
    diagnostics.push({
      file,
      absolutePath,
      severity: 'error',
      message: z.prettifyError(result.error),
    });
    return;
  }
  return { type: 'meta', path: file, absolutePath, data: result.data };
}
