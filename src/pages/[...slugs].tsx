import type { ComponentProps, ReactNode } from 'react';
import { Fragment } from 'react/jsx-runtime';
import type { PageProps } from 'waku/router';

import defaultMdxComponents from '@fumadocs/base-ui/mdx';
import { DocsLayout } from '@fumadocs/base-ui/layouts/docs';
import { DocsPage, DocsTitle, DocsDescription, DocsBody } from '@fumadocs/base-ui/page';
import { CodeBlock, Pre } from '@fumadocs/base-ui/components/codeblock';
import type { Node as TreeNode } from 'fumadocs-core/page-tree';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkCodeTab } from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { remarkNpm } from 'fumadocs-core/mdx-plugins/remark-npm';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins/remark-mdx-mermaid';
import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc } from 'fumadocs-core/mdx-plugins/rehype-toc';
import type { TOCItemType } from 'fumadocs-core/toc';

import { getSource, type Source, type SourcePage } from '@/lib/source/index.js';
import { resolveSlugs } from '@/lib/source/i18n.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { getDocsLayoutProps } from '@/layouts/config.js';
import { PageMetaTags, type PageMeta } from '@/lib/meta.js';
import { createMarkdownCompiler, plugin, type CompileResult } from '@/lib/md.js';
import { remarkGithubAlert } from '@/lib/remark-github-alert.js';
import { revalidable } from '@/lib/revalidable.js';
import type { MarkdownConfig } from '@/config/schema.js';
import { Diagnostics } from '@/components/diagnostics.js';
import { Mermaid } from '@/components/mermaid.js';
import { Image } from '@/components/image.js';
import { assetUrl } from '@/lib/asset.js';
import path from 'node:path';

const MDX_PASS_THROUGH: ['mdxJsxFlowElement', 'mdxJsxTextElement'] = [
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
];

const getCompiler = revalidable({
  create(allowDangerousHtml: MarkdownConfig['allowDangerousHtml']) {
    const allowHtml = allowDangerousHtml !== 'off';
    return createMarkdownCompiler({
      remarkPlugins: [
        remarkGfm,
        remarkMath,
        remarkMdxMermaid,
        remarkGithubAlert,
        plugin(remarkHeading, { generateToc: false }),
        plugin(remarkNpm, { persist: { id: 'package-manager' } }),
        remarkCodeTab,
      ],
      remarkRehypeOptions: {
        allowDangerousHtml: allowHtml,
        passThrough: MDX_PASS_THROUGH,
      },
      rehypePlugins: [
        ...(allowHtml
          ? [
              plugin(rehypeRaw, {
                passThrough: MDX_PASS_THROUGH,
                tagfilter: allowDangerousHtml === 'safe',
              }),
            ]
          : []),
        rehypeKatex,
        plugin(rehypeCode, { lazy: true, fallbackLanguage: 'text' }),
        plugin(rehypeToc, { exportToc: { as: 'data' } }),
      ],
    });
  },
});

type HrefKind = 'external' | 'anchor' | 'markdown' | 'directory' | 'asset';

function classifyHref(href: string): HrefKind {
  if (URL.canParse(href) || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
    return 'external';
  }
  // Same-page fragment; left to the default link so the router handles scrolling.
  if (href.startsWith('#')) return 'anchor';
  const pathPart = href.split(/[?#]/)[0] ?? '';
  if (/\.mdx?$/i.test(pathPart)) return 'markdown';
  // Heuristic: an extensionless last segment is treated as a directory (resolved
  // to its index page in ServerLink, falling back to `asset` if none exists).
  if (!path.extname(pathPart)) return 'directory';
  return 'asset';
}

// A directory's index page, in priority order: lowercase `index` (fumadocs'
// folder page) first, then README in the casings seen in practice.
const DIRECTORY_INDEX_FILES = [
  'index.md',
  'index.mdx',
  'README.md',
  'README.mdx',
  'readme.md',
  'readme.mdx',
  'Readme.md',
  'Readme.mdx',
];

function getMarkdownComponents(page: SourcePage, source: Source) {
  const project = page.data.project;
  const pageAbs = page.absolutePath!;
  const DefaultLink = defaultMdxComponents.a!;

  function ServerImage({ src, ...rest }: ComponentProps<'img'>) {
    if (src && !URL.canParse(src) && !src.startsWith('//')) {
      src = assetUrl(project, pageAbs, src);
    }
    return <Image src={src} {...rest} />;
  }

  // Index pages by absolute path once: `getPages()` rebuilds and scans the full
  // list on every call, and a single document can hold many links.
  const pagesByPath = new Map(source.getPages().map((p) => [p.absolutePath, p]));

  // First existing index file in a directory, in DIRECTORY_INDEX_FILES priority.
  function directoryIndexPage(dir: string) {
    return DIRECTORY_INDEX_FILES.map((f) => pagesByPath.get(path.join(dir, f))).find(Boolean);
  }

  function ServerLink({ href, ...rest }: ComponentProps<'a'>) {
    if (!href) return <DefaultLink href={href} {...rest} />;

    const kind = classifyHref(href);
    if (kind === 'external' || kind === 'anchor') return <DefaultLink href={href} {...rest} />;

    const [pathPart = '', suffix = ''] = href.split(/(?=[?#])/, 2);
    const abs = path.resolve(path.dirname(pageAbs), pathPart);

    function assetLink() {
      const url = assetUrl(project, pageAbs, pathPart) + suffix;
      return <a href={url} target="_blank" rel="noreferrer noopener" {...rest} />;
    }

    switch (kind) {
      case 'asset':
        return assetLink();
      case 'markdown': {
        const target = pagesByPath.get(abs);
        return <DefaultLink href={target ? target.url + suffix : href} {...rest} />;
      }
      case 'directory': {
        const target = directoryIndexPage(abs);
        if (target) return <DefaultLink href={target.url + suffix} {...rest} />;
        // No index page: serve the directory path as an extensionless asset.
        return assetLink();
      }
      default:
        // Unreachable: a new HrefKind without a case fails to compile here.
        return kind satisfies never;
    }
  }

  return {
    ...defaultMdxComponents,
    Mermaid,
    img: ServerImage,
    a: ServerLink,
  };
}

async function renderShell(children: ReactNode, meta: PageMeta, locale?: string) {
  const config = await getConfigRuntime();
  // getSource is cached per config, so this does not rebuild the loader.
  const [layoutProps, { diagnostics }] = await Promise.all([
    getDocsLayoutProps(locale),
    getSource(config),
  ]);
  return (
    <DocsLayout {...layoutProps}>
      <PageMetaTags config={config} page={meta} />
      <Diagnostics diagnostics={diagnostics} />
      {children}
    </DocsLayout>
  );
}

// The request path for the current page, built from the catch-all slugs rather
// than the request URL: under RSC the in-flight request can be an internal
// `/RSC/...` fetch, so req.url is unreliable for canonical/og:url.
function pathnameFromSlugs(rawSlugs: readonly string[]): string {
  return '/' + rawSlugs.map(encodeURIComponent).join('/');
}

const HEADING_CLASS = 'text-fd-foreground font-medium first:mt-0 mt-6 mb-1';

function PageTreeNodes({ nodes, skipRef }: { nodes: TreeNode[]; skipRef?: string }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === 'page' && node.$ref === skipRef) return null;
        if (node.type === 'separator') {
          return (
            <p key={node.$id ?? i} className={HEADING_CLASS}>
              {node.name}
            </p>
          );
        }
        if (node.type === 'folder') {
          const children = node.index ? [node.index, ...node.children] : node.children;
          return (
            <Fragment key={node.$id ?? i}>
              <p className={HEADING_CLASS}>{node.name}</p>
              <div className="ps-3">
                <PageTreeNodes nodes={children} skipRef={skipRef} />
              </div>
            </Fragment>
          );
        }
        return (
          <a
            key={node.$id ?? i}
            href={node.url}
            className="block py-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {node.name}
          </a>
        );
      })}
    </>
  );
}

function PageTreeList({ nodes, skipRef }: { nodes: TreeNode[]; skipRef?: string }) {
  return (
    <div className="flex flex-col">
      <PageTreeNodes nodes={nodes} skipRef={skipRef} />
    </div>
  );
}

export default async function DocsSlugPage({ slugs: rawSlugs }: PageProps<'/[...slugs]'>) {
  const config = await getConfigRuntime();
  const { source } = await getSource(config);
  const { locale, slugs } = resolveSlugs(rawSlugs, config.i18n);
  const page = source.getPage(slugs, locale);
  const pathname = pathnameFromSlugs(rawSlugs);

  // Synthetic project index: list the pages of that project as a tree. The tab
  // is the root folder that contains this synthetic index page as a child; the
  // index page itself is excluded from the listing.
  if (page?.data.index) {
    const ref = `${page.data.project.slug}/index.md`;
    const tab = source
      .getPageTree(locale)
      .children.find(
        (n): n is Extract<TreeNode, { type: 'folder' }> =>
          n.type === 'folder' && n.children.some((c) => c.type === 'page' && c.$ref === ref),
      );
    return renderShell(
      <DocsPage>
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.description && <DocsDescription>{page.data.description}</DocsDescription>}
        <PageTreeList nodes={tab?.children ?? []} skipRef={ref} />
      </DocsPage>,
      { title: page.data.title, description: page.data.description, pathname },
      locale,
    );
  }

  if (!page) {
    if (slugs.length === 0) {
      const rootDescription = config.site.description ?? 'All Markdown files in the project.';
      return renderShell(
        <DocsPage>
          <DocsTitle>{config.site.title}</DocsTitle>
          <DocsDescription>{rootDescription}</DocsDescription>
          <PageTreeList nodes={source.getPageTree(locale).children} />
        </DocsPage>,
        { title: config.site.title, description: rootDescription, pathname },
        locale,
      );
    }
    return renderShell(
      <DocsPage>
        <DocsTitle>Not Found</DocsTitle>
        <DocsDescription>The page you are looking for does not exist.</DocsDescription>
      </DocsPage>,
      { title: 'Not Found', description: 'The page you are looking for does not exist.' },
      locale,
    );
  }

  const compiler = getCompiler(config.markdown.allowDangerousHtml);
  let compiled: CompileResult;
  try {
    compiled = await compiler.compile({
      path: page.absolutePath,
      cwd: page.data.project.dir,
      value: page.data.content,
    });
  } catch (e) {
    return renderShell(
      <DocsPage>
        <DocsTitle>Failed to Compile</DocsTitle>
        {e instanceof Error ? (
          <>
            <DocsDescription>{e.message}</DocsDescription>
            {e.stack && (
              <CodeBlock>
                <Pre>{e.stack}</Pre>
              </CodeBlock>
            )}
          </>
        ) : (
          <DocsDescription>{String(e)}</DocsDescription>
        )}
      </DocsPage>,
      { title: 'Failed to Compile' },
    );
  }

  const markdownComponents = getMarkdownComponents(page, source);
  const toc = compiled.file.data.rehypeToc?.map(
    (item): TOCItemType => ({
      ...item,
      title: compiler.render(
        { type: 'root', children: item.title.children },
        compiled.file,
        markdownComponents,
      ),
    }),
  );

  return renderShell(
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Fragment key={page.absolutePath}>{compiled.render(markdownComponents)}</Fragment>
      </DocsBody>
    </DocsPage>,
    { title: page.data.title, description: page.data.description, pathname },
    locale,
  );
}

export async function getConfig() {
  return { render: 'dynamic' } as const;
}