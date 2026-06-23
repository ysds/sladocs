---
title: Introduction
description: A zero-install Markdown preview server.
icon: BookOpen
---

**sladocs** is a server that previews a directory of Markdown with a single command. It gives you [Fumadocs](https://fumadocs.dev)' polished UI — sidebar, table of contents, full-text search, and dark mode — with no installation and no configuration.

```files
project
├── docs
│   ├── index.md
│   ├── spec.md
│   └── design.md
├── README.md
```

```bash
npx sladocs
```

## When to use sladocs

If you keep your documentation as Markdown in the same repository as your code, `sladocs` is a simple way to read it. It mirrors your directory structure in the navigation and searches across every page, so multi-page documents — design notes, runbooks, specifications — are as easy to follow as a single README.

Write in GitHub Flavored Markdown and preview it locally, close to how it will look on GitHub. Add a `meta.json` to order and group your pages the way a reader would expect, rather than by file name.

## What you get

- GFM rendering — callouts, code blocks, and inline HTML render close to how they look on GitHub.
- Mermaid diagrams, KaTeX math, and Shiki syntax highlighting.
- Relative links to images, HTML prototypes, PDFs, and more, served as-is.
- `meta.json` navigation, resolved links between pages, and full-text search.
- Hot reload on save, plus a multi-project layout for several directories at once.

When you are ready to publish, [`sladocs-build`](./static-builds.md) turns the same docs into a static site for GitHub Pages or any web server.

## How it differs from fumadocs-preview

Fumadocs also has an official CLI, [fumadocs-preview](https://www.fumadocs.dev/docs/cli/preview), for quickly displaying a Markdown directory. When the two overlap, keep these differences in mind:

- **Zero-install even when configured.** fumadocs-preview assumes a local install as a dev dependency in order to customize it, but sladocs stays `npx`-only even after you add configuration.
- **Links stay plain Markdown.** Ordinary relative-path links between pages resolve as written — no rewriting and no special build-time syntax required.
- **Static assets served as-is.** Not only images, but relative links to HTML prototypes, PDFs, and the like are served directly.
