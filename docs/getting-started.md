---
title: Getting Started
description: Preview any directory of Markdown files in seconds.
icon: Rocket
---

All `sladocs` needs is a directory containing Markdown — no configuration, no added dependencies.

## Requirements

- **Node.js 20 or later** (22 LTS recommended)
- A directory containing `.md` or `.mdx` files

## Running

```bash
npx sladocs
```

This previews the current directory. Pass a path to preview a different one.

```bash
npx sladocs ./docs
```

Once it starts, a URL is printed — open it in your browser.

```text
ready: http://localhost:8080/
```

Press `Ctrl-C` to cleanly shut down the file watcher and the HTTP server.

> [!NOTE]
> On first run, `sladocs` is downloaded into the npm cache.
> Subsequent runs reuse that cache and start in under a second.

## What gets included

`sladocs` builds the site by collecting the Markdown (`.md`, `.mdx`) and `meta.json` files under the target directory. The sidebar, search, and hot reload all follow this collected set. `.mdx` files are parsed as Markdown only — JSX and `import`/`export` are left as plain text, not evaluated.

For a git repository, files listed in `.gitignore` are excluded automatically — you don't need to spell out `node_modules`, `dist`, and so on. For a non-git directory, only `node_modules` is excluded.

You can also tune what gets collected with [`include` / `exclude`](./configuration.md#projects).

## Live reload

While the server is running, edit and save any file shown on the site and the browser updates in place.

## Multiple projects

By default, `sladocs` collects Markdown from a single directory. Pass two or more paths and it switches to a multi-project layout.

```bash
npx sladocs ./docs ./packages/web
```

Each directory becomes a separate tab (dropdown) in the top navigation. Tab labels use the folder name, but you can override them in `sladocs.json` (see [Configuration](./configuration.md)).

## Multiple languages

Declare your languages in `sladocs.json` and name files by locale (`guide.md`, `guide.ja.md`). A language switcher then appears in the sidebar.

```json
{
  "i18n": { "languages": ["en", "ja"], "defaultLanguage": "en" }
}
```

See [`i18n`](./configuration.md#i18n) for file naming, URL layout, and switcher labels.

## CLI reference

`sladocs` provides only a single command. There are no subcommands.

```text
sladocs [dirs...] [options]
```

### Arguments

| Argument | Description |
| --- | --- |
| `dirs...` | One or more directories to preview. Defaults to the current working directory. When you specify multiple, each becomes a tab in the top navigation. |

If `projects` is declared in `sladocs.json`, the CLI arguments are ignored and the configuration takes precedence (see [Configuration](./configuration.md)).

### Options

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--port <port>` | `-p` | `8080` | Starting port to listen on. If in use, it steps up to the next free port in order. |
| `--host <host>` | `-H` | `localhost` | Bind address. Use `0.0.0.0` for a preview visible on the LAN. |
| `--no-watch` | – | – | Disable file watching and hot reload. Enabled by default. |
| `--help` | `-h` | – | Show usage. |
| `--version` | `-v` | – | Show the installed version. |
