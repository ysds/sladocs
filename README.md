# sladocs

> A zero-install Markdown preview server with a [fumadocs](https://fumadocs.dev)-style UI.

Point it at a directory of `.md` / `.mdx` files and read them in your browser —
sidebar, search, dark mode, and all. No install, no config, no build step.

```bash
npx sladocs ./docs
```

## Why

A README renders fine on GitHub, but a folder of design notes, runbooks, and
specs doesn't — there's no sidebar, no search, no sense of structure. Dedicated
docs frameworks fix that, but they want a build step and a config file before
they show you anything.

`sladocs` is the in-between: the fumadocs reading experience, available
behind a single `npx` command, over the Markdown you already have.

## What you get

- **GitHub-friendly Markdown.** GFM tables and task lists, `> [!NOTE]` alerts,
  Mermaid and KaTeX in fenced blocks, Shiki highlighting — the same source
  renders on GitHub. `.mdx` files are read too, but only as Markdown — JSX and
  `import`/`export` are not evaluated.
- **Relative links and assets.** Link to images, HTML prototypes, PDFs, videos,
  or other pages by relative path; they resolve here and on GitHub alike.
  Git-ignored files, dotfiles, and anything outside the project are never
  served — safe to share on the LAN.
- **Full-text search** across every page, served by fumadocs' flexsearch index.
- **Hot reload that keeps your place.** Edits stream over WebSocket and the page
  updates in place — your scroll position and focus survive.
- **`meta.json` navigation.** Order and group pages with the same schema fumadocs
  uses; an existing fumadocs content tree works as-is.
- **Multi-project tabs.** Preview several docs roots at once as top-level tabs.
- **Internationalization.** Opt-in multilingual docs with `guide.ja.md`-style
  files and a language switcher.

## Usage

```bash
# Preview a docs folder
npx sladocs ./docs

# Or the current directory
npx sladocs
```

Common flags:

```bash
npx sladocs ./docs -p 4321      # choose a port
npx sladocs ./docs -H 0.0.0.0   # bind all interfaces (LAN preview)
npx sladocs ./guides ./blog     # multiple roots → tabs
```

## Configuration

Optional. Drop a `sladocs.json` (or `.yaml`) next to your docs when the
defaults aren't enough:

```json
{
  "site": {
    "title": "My Project",
    "github": "https://github.com/ysds/my-project"
  },
  "projects": [
    { "name": "Guides", "dir": "./docs" },
    { "name": "Blog",   "dir": "./blog" }
  ]
}
```

See [packages/sladocs/docs/configuration.md](packages/sladocs/docs/configuration.md)
for the full schema, including theme color, raw-HTML handling, and
internationalization (`i18n`).

## Static builds

To publish the docs as a static site (GitHub Pages or any web server), use the
companion CLI [`sladocs-build`](packages/sladocs-build):

```bash
npx sladocs-build ./docs --out ./site
```

It produces plain HTML/CSS/JS — no server needed. Supports `--base-path` for
subpath hosting and the same `sladocs.json` config.

## Development

This repo is a pnpm workspace with two published packages — `sladocs`
(`packages/sladocs`, the preview server) and `sladocs-build`
(`packages/sladocs-build`, the static-site CLI):

```bash
pnpm install
pnpm build         # builds all packages
pnpm types:check
pnpm test
```

Preview your build against a real docs tree:

```bash
node packages/sladocs/dist/lib/cli/index.mjs ./docs
```

## License

MIT
