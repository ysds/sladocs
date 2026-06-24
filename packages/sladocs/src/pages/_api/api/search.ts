import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';
import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { getSource, type Source } from '@/lib/source/index.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { revalidable } from '@/lib/revalidable.js';

const getServer = revalidable({
  async create(source: Source) {
    return flexsearchFromSource(source, {
      buildIndex(page) {
        return {
          id: page.url,
          structuredData: structure(page.data.content),
          title: page.data.title,
          description: page.data.description,
          url: page.url,
        };
      },
    });
  },
});

export async function GET(request: Request) {
  const config = await getConfigRuntime();
  const { source } = await getSource(config);
  const server = await getServer(source);
  return server.GET(request);
}

export async function getConfig() {
  return { render: 'dynamic' } as const;
}
