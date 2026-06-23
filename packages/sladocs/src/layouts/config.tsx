import type { DocsLayoutProps } from '@fumadocs/base-ui/layouts/docs';
import { getSource } from '@/lib/source/index.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { normalizeProjects } from '@/lib/source/config.js';
import { DocsPreviewLogo } from '@/components/logo.js';
import { isStatic } from '@/lib/env.js';

export async function getDocsLayoutProps(locale?: string): Promise<DocsLayoutProps> {
  const config = await getConfigRuntime();
  const { source } = await getSource(config);

  const hasMultipleProjects = normalizeProjects(config).length > 1;

  return {
    tree: source.getPageTree(locale),
    nav: {
      title: (
        <>
          <DocsPreviewLogo className="size-5" />
          {config.site.title}
        </>
      ),
    },
    githubUrl: config.site.github,
    searchToggle: { enabled: !isStatic() },
    tabs: hasMultipleProjects ? {} : false,
    // The switcher itself is rendered by the provider's I18nProvider; the layout
    // only needs to know i18n is on so it shows the language trigger.
    i18n: Boolean(config.i18n),
  };
}
