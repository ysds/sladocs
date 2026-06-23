import { watch } from 'chokidar';
import { normalizeProjects } from './config.js';
import { createIgnoreMatcher } from './gitignore.js';
import type { ParsedAppConfig } from '@/config/schema.js';

export async function startWatcher(config: ParsedAppConfig) {
  const projects = normalizeProjects(config);

  // One matcher per project; chokidar ignores a path when any matcher claims
  // it. A matcher only ever claims paths inside its own project directory.
  const ignored = await Promise.all(
    projects.map((project) => createIgnoreMatcher(project.dir, project.exclude)),
  );

  const watcher = watch([], {
    ignoreInitial: true,
    followSymlinks: false,
    ignored,
  });

  for (const project of projects) {
    watcher.add(project.dir);
  }

  return watcher;
}
