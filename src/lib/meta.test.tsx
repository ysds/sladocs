import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageMetaTags, RootMeta, formatDocumentTitle } from './meta.js';
import { configSchema, type ParsedAppConfig } from '@/config/schema.js';

function makeConfig(site: Record<string, unknown>): ParsedAppConfig {
  return configSchema.parse({
    site,
    projects: [{ dir: '/proj/docs', name: 'Docs' }],
  });
}

// Render RootMeta + PageMetaTags together, as they appear on a real page
// (RootMeta in <head>, PageMetaTags hoisted there by React).
function renderPage(config: ParsedAppConfig, page: Parameters<typeof PageMetaTags>[0]['page']) {
  return renderToStaticMarkup(
    <>
      <RootMeta config={config} />
      <PageMetaTags config={config} page={page} />
    </>,
  );
}

function countMatches(html: string, re: RegExp): number {
  return html.match(re)?.length ?? 0;
}

describe('formatDocumentTitle', () => {
  it('joins page and site titles', () => {
    expect(formatDocumentTitle('Guide', 'sladocs')).toBe('Guide | sladocs');
  });

  it('collapses to the site title when they match', () => {
    expect(formatDocumentTitle('sladocs', 'sladocs')).toBe('sladocs');
  });
});

describe('description meta tag', () => {
  it('emits exactly one name="description" when both site and page have one', () => {
    const config = makeConfig({ title: 'sladocs', description: 'Site default description' });
    const html = renderPage(config, { title: 'Guide', description: 'Page description', pathname: '/guide' });

    expect(countMatches(html, /name="description"/g)).toBe(1);
    expect(html).toContain('content="Page description"');
    expect(html).not.toContain('content="Site default description"');
  });

  it('falls back to the site description when the page has none', () => {
    const config = makeConfig({ title: 'sladocs', description: 'Site default description' });
    const html = renderPage(config, { title: 'Home', pathname: '/' });

    expect(countMatches(html, /name="description"/g)).toBe(1);
    expect(html).toContain('content="Site default description"');
  });

  it('emits no description tag when neither is set', () => {
    const config = makeConfig({ title: 'sladocs' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(countMatches(html, /name="description"/g)).toBe(0);
  });
});

describe('canonical and og:url', () => {
  it('emits absolute canonical/og:url when site.url and pathname are set', () => {
    const config = makeConfig({ title: 'sladocs', url: 'https://example.com' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('href="https://example.com/guide"');
    expect(html).toContain('property="og:url" content="https://example.com/guide"');
  });

  it('omits canonical/og:url when pathname is absent (non-canonical pages)', () => {
    const config = makeConfig({ title: 'sladocs', url: 'https://example.com' });
    const html = renderPage(config, { title: 'Not Found' });

    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('og:url');
  });
});

describe('og:image', () => {
  it('makes a relative ogImage absolute against site.url', () => {
    const config = makeConfig({ title: 'sladocs', url: 'https://example.com', ogImage: 'og.png' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('property="og:image" content="https://example.com/api/asset/docs/og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('uses summary card when no image is configured', () => {
    const config = makeConfig({ title: 'sladocs', url: 'https://example.com' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('name="twitter:card" content="summary"');
  });

  it('passes an absolute ogImage through even without site.url', () => {
    const config = makeConfig({ title: 'sladocs', ogImage: 'https://cdn.example.com/og.png' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('property="og:image" content="https://cdn.example.com/og.png"');
  });

  it('omits og:image for a relative ogImage when site.url is unset', () => {
    const config = makeConfig({ title: 'sladocs', ogImage: 'og.png' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).not.toContain('og:image');
    expect(html).not.toContain('twitter:image');
  });
});

describe('favicon', () => {
  it('emits an SVG icon with an .ico sibling fallback', () => {
    const config = makeConfig({ title: 'sladocs', favicon: 'favicon.svg' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('href="/api/asset/docs/favicon.svg"');
    expect(html).toContain('type="image/svg+xml"');
    expect(html).toContain('href="/api/asset/docs/favicon.ico"');
  });

  it('passes through an absolute favicon URL without fabricating an .ico sibling', () => {
    const config = makeConfig({ title: 'sladocs', favicon: 'https://cdn.example.com/icons/logo.svg' });
    const html = renderPage(config, { title: 'Guide', pathname: '/guide' });

    expect(html).toContain('href="https://cdn.example.com/icons/logo.svg"');
    expect(html).not.toContain('logo.ico');
    expect(html).not.toContain('favicon.ico');
  });
});
