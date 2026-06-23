import { loader, source } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { revalidable } from '@/lib/revalidable.js';
import { getPages } from './storage.js';
import type { ParsedAppConfig } from '@/config/schema.js';

export const getSource = revalidable({
  // Lets `--no-watch` (and any missed watcher event) pick up edits on reload:
  // the mtime-based files cache makes re-running getPages cheap.
  staleTime: 1_000,
  async create(config: ParsedAppConfig) {
    const { pages, metas, diagnostics } = await getPages(config);
    return {
      source: loader({
        source: source({ pages, metas }),
        plugins: [lucideIconsPlugin()],
        baseUrl: '/',
        // `names` is for the UI switcher only; loader expects a bare I18nConfig.
        // `hideLocale` is fixed to 'default-locale' (the loader defaults to
        // 'never', which would prefix every URL including the default language).
        i18n: config.i18n
          ? {
              languages: config.i18n.languages,
              defaultLanguage: config.i18n.defaultLanguage,
              hideLocale: 'default-locale',
              parser: config.i18n.parser,
            }
          : undefined,
      }),
      diagnostics,
    };
  },
});

export type Source = Awaited<ReturnType<typeof getSource>>['source'];
export type SourcePage = Source['$inferPage'];
