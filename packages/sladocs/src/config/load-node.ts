import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { configSchema, type ParsedAppConfig } from './schema.js';
import { isAbsoluteRef } from '@/lib/asset.js';

const CANDIDATES = ['sladocs.json', 'sladocs.yaml', 'sladocs.yml'];

export function findConfigPath(): string | null {
  const dir = process.env.ROOT_DIR ?? process.cwd();
  for (const name of CANDIDATES) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function parseConfig(file: string, raw: unknown): ParsedAppConfig {
  const result = configSchema.safeParse(raw);
  if (result.error) {
    throw new Error(
      `The config file "${file}" is invalid:\n${z.prettifyError(result.error)}`,
      { cause: result.error },
    );
  }
  warnSiteConfig(file, result.data);
  return result.data;
}

// Misconfigurations that should not reject the config but leave meta tags
// silently broken. Warns once at load time (see getConfigRuntime caching).
function warnSiteConfig(file: string, config: ParsedAppConfig): void {
  const { site } = config;
  // A relative ogImage needs site.url to become absolute; an absolute one works
  // on its own, so only the relative case is broken by a missing site.url.
  if (site.ogImage && !isAbsoluteRef(site.ogImage) && !site.url) {
    console.warn(
      `"${file}": site.ogImage is a relative path but site.url is missing; og:image needs an absolute URL and will be omitted.`,
    );
  }
}

export function loadConfigFile(file: string): ParsedAppConfig {
  const raw = fs.readFileSync(file, 'utf-8');
  const ext = path.extname(file).toLowerCase();
  const parsed = ext === '.yaml' || ext === '.yml' ? parseYaml(raw) : JSON.parse(raw);
  return parseConfig(file, parsed);
}
