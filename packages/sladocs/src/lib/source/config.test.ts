import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeProjects } from './config.js';
import { configSchema, type AppConfig } from '@/config/schema.js';

function normalize(input: AppConfig) {
  return normalizeProjects(configSchema.parse(input));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normalizeProjects', () => {
  it('resolves dirs against ROOT_DIR and derives name and slug from the dir', () => {
    vi.stubEnv('ROOT_DIR', '/base');
    const [project] = normalize({ projects: [{ dir: 'My Docs' }] });
    expect(project).toEqual({
      name: 'My Docs',
      slug: 'my-docs',
      dir: '/base/My Docs',
      include: ['**/*.{md,mdx}', '**/meta.json'],
      exclude: [],
    });
  });

  it('prefers an explicit name and keeps include/exclude overrides', () => {
    const [project] = normalize({
      projects: [{ dir: '/abs/docs', name: 'API Reference', include: ['*.md'], exclude: ['tmp/**'] }],
    });
    expect(project).toMatchObject({
      name: 'API Reference',
      slug: 'api-reference',
      dir: '/abs/docs',
      include: ['*.md'],
      exclude: ['tmp/**'],
    });
  });

  it('falls back to the "docs" slug when the name has no slug characters', () => {
    const [project] = normalize({ projects: [{ dir: '/abs/日本語' }] });
    expect(project!.slug).toBe('docs');
  });

  it('suffixes colliding slugs', () => {
    const projects = normalize({
      projects: [{ dir: '/a/docs' }, { dir: '/b/docs' }, { dir: '/c/docs' }],
    });
    expect(projects.map((p) => p.slug)).toEqual(['docs', 'docs-2', 'docs-3']);
  });

  it('defaults to ROOT_DIR itself when no projects are configured', () => {
    vi.stubEnv('ROOT_DIR', '/base/site');
    vi.stubEnv('DEFAULT_PROJECT_DIR', '');
    const projects = normalize({});
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ dir: '/base/site', name: 'site', slug: 'site' });
  });

  it('uses DEFAULT_PROJECT_DIR entries when no projects are configured', () => {
    vi.stubEnv('ROOT_DIR', '/base');
    vi.stubEnv('DEFAULT_PROJECT_DIR', JSON.stringify(['a', 'b']));
    const projects = normalize({});
    expect(projects.map((p) => p.dir)).toEqual(['/base/a', '/base/b']);
  });

  it('merges top-level exclude into every project', () => {
    const projects = normalize({
      exclude: ['**/CLAUDE.md', '**/AGENTS.md'],
      projects: [{ dir: '/a' }, { dir: '/b', exclude: ['tmp/**'] }],
    });
    expect(projects[0]!.exclude).toEqual(['**/CLAUDE.md', '**/AGENTS.md']);
    expect(projects[1]!.exclude).toEqual(['**/CLAUDE.md', '**/AGENTS.md', 'tmp/**']);
  });

  it('leaves project exclude empty when no global or project exclude is set', () => {
    const [project] = normalize({ projects: [{ dir: '/a' }] });
    expect(project!.exclude).toEqual([]);
  });
});
