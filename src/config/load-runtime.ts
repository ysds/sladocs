import { revalidable } from '@/lib/revalidable.js';
import { configSchema, type AppConfig, type ParsedAppConfig } from './schema.js';
import { findConfigPath, loadConfigFile } from './load-node.js';

function defaultConfig(): ParsedAppConfig {
  return configSchema.parse({} satisfies AppConfig);
}

export const getConfigRuntime = revalidable<[], Promise<ParsedAppConfig>>({
  async create() {
    const file = findConfigPath();
    if (!file) return defaultConfig();
    try {
      return loadConfigFile(file);
    } catch (e) {
      console.error(
        `Failed to load config from ${file}:`,
        e instanceof Error ? e.message : String(e),
      );
      return defaultConfig();
    }
  },
});
