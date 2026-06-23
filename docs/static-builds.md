---
title: Static Builds
description: Publish your docs as a static site with sladocs-build.
icon: Globe
---

`sladocs` previews Markdown locally. To **publish** the same docs as a static
site — GitHub Pages, S3, Netlify, or any web server — use its companion CLI,
[`sladocs-build`](https://www.npmjs.com/package/sladocs-build).

It reads the same directory and the same `sladocs.json`, then emits plain
HTML/CSS/JS with no server to run.

```bash
npx sladocs-build ./docs --out ./site
```

Serve the output with any static file server:

```bash
npx serve ./site
```

> [!NOTE]
> `sladocs-build` bundles the full build toolchain, so its first run downloads
> more than `sladocs`. Keep using `sladocs` for day-to-day preview; reach for
> `sladocs-build` only when you publish.

## Subpath hosting

When the site is not served from the domain root — for example a GitHub project
page at `https://user.github.io/repo/` — pass `--base-path`. Every link, asset,
and asset route is rewritten to that prefix.

```bash
npx sladocs-build ./docs --out ./site --base-path /repo/
```

## GitHub Pages

A ready-to-use workflow lives in the package at
[`examples/github-pages.yml`](https://github.com/ysds/sladocs/blob/main/packages/sladocs-build/examples/github-pages.yml).
It builds the site and deploys it with the official Pages actions, which serve
the output as-is — including the `_app` directory — so no `.nojekyll` is needed.

If you publish to a `gh-pages` branch instead, add an empty `.nojekyll` to the
output (`touch ./site/.nojekyll`) so Jekyll does not skip `_app`.

## CLI reference

```text
sladocs-build [dirs...] --out <dir> [options]
```

### Arguments

| Argument | Description |
| --- | --- |
| `dirs...` | One or more directories to build, the same as `sladocs`. Defaults to the current working directory; multiple directories build a multi-project (tabbed) site. Ignored when `projects` is declared in `sladocs.json`. |

### Options

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--out <dir>` | `-o` | – | Output directory. Required. |
| `--base-path <path>` | – | `/` | Subpath the site is served from, e.g. `/repo/`. |
| `--version` | `-v` | – | Show the installed version. |
| `--help` | `-h` | – | Show usage. |
