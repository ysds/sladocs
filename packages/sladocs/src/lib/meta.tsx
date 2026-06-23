import path from 'node:path';
import type { ReactNode } from 'react';
import type { ParsedAppConfig } from '@/config/schema.js';
import { normalizeProjects } from '@/lib/source/config.js';
import { assetUrl, isAbsoluteRef } from '@/lib/asset.js';

function absolute(siteUrl: string | undefined, urlOrPath: string | undefined): string | null {
  if (!siteUrl || !urlOrPath) return null;
  try {
    return new URL(urlOrPath, siteUrl).href;
  } catch {
    return null;
  }
}

// Resolve a site.ogImage/site.favicon value to a serving URL. Absolute refs pass
// through; relative paths are served via /api/asset of the first project.
function assetMetaUrl(config: ParsedAppConfig, ref: string | undefined): string | null {
  if (!ref) return null;
  if (isAbsoluteRef(ref)) return ref;
  const project = normalizeProjects(config)[0];
  if (!project) return null;
  // A sentinel file under project.dir makes assetUrl's dirname the project root.
  return assetUrl(project, path.join(project.dir, '_'), ref);
}

export interface PageMeta {
  title: string;
  description?: string;
  // A `/`-rooted site-relative path; omit for non-canonical pages (404, errors).
  pathname?: string;
}

// Per-page meta tags, hoisted into <head> by React. description falls back to
// site.description here so the tag is emitted once, not also by RootMeta.
export function PageMetaTags({ config, page }: { config: ParsedAppConfig; page: PageMeta }) {
  const { site } = config;
  const description = page.description ?? site.description;
  const canonical = absolute(site.url, page.pathname);
  // og:image must be absolute for crawlers. An already-absolute ogImage passes
  // through; a relative one needs site.url to resolve, else it is omitted.
  const ogImage = assetMetaUrl(config, site.ogImage);
  const image = ogImage && (isAbsoluteRef(ogImage) ? ogImage : absolute(site.url, ogImage));

  return (
    <>
      <title>{formatDocumentTitle(page.title, site.title)}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:title" content={page.title} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:title" content={page.title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && (
        <>
          <meta property="og:image" content={image} />
          <meta name="twitter:image" content={image} />
        </>
      )}
    </>
  );
}

// Page-independent meta. description is omitted here (PageMetaTags owns it);
// charset/viewport come from Waku's default head.
export function RootMeta({ config }: { config: ParsedAppConfig }): ReactNode {
  const { site, color } = config;
  const favicon = assetMetaUrl(config, site.favicon);
  const hasImage = assetMetaUrl(config, site.ogImage) !== null;

  // For a local SVG favicon, emit a sibling favicon.ico fallback for older
  // browsers. Skipped for absolute URLs, whose sibling .ico may not exist.
  const isSvgFavicon = /\.svg($|[?#])/i.test(site.favicon ?? '');
  const icoFallback =
    isSvgFavicon && !isAbsoluteRef(site.favicon!)
      ? assetMetaUrl(config, replaceFilename(site.favicon!, 'favicon.ico'))
      : null;

  return (
    <>
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.title} />
      <meta name="twitter:card" content={hasImage ? 'summary_large_image' : 'summary'} />
      {color.primary && <meta name="theme-color" content={color.primary} />}
      {/* ICO first as a fallback, SVG last so browsers that support it (and
          honor its prefers-color-scheme) win the last-declared icon. */}
      {icoFallback && <link rel="icon" sizes="any" href={icoFallback} />}
      {favicon && (
        <link rel="icon" href={favicon} type={isSvgFavicon ? 'image/svg+xml' : undefined} />
      )}
    </>
  );
}

function replaceFilename(ref: string, filename: string): string {
  const slash = ref.lastIndexOf('/');
  return slash === -1 ? filename : ref.slice(0, slash + 1) + filename;
}

export function formatDocumentTitle(pageTitle: string, siteTitle: string): string {
  if (pageTitle === siteTitle) return siteTitle;
  return `${pageTitle} | ${siteTitle}`;
}
