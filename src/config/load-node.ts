import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { configSchema, type ParsedAppConfig } from './schema.js';

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
  return result.data;
}

export function loadConfigFile(file: string): ParsedAppConfig {
  const raw = fs.readFileSync(file, 'utf-8');
  const ext = path.extname(file).toLowerCase();
  const parsed = ext === '.yaml' || ext === '.yml' ? parseYaml(raw) : JSON.parse(raw);
  return parseConfig(file, parsed);
}
