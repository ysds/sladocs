# sladocs-build

Build a static documentation site from Markdown/MDX, powered by
[fumadocs](https://fumadocs.dev) and [Waku](https://waku.gg). The output is
plain HTML/CSS/JS you can host on any web server — GitHub Pages, S3, Netlify, a
plain nginx, anywhere.

This is the static-site companion to [`sladocs`](https://www.npmjs.com/package/sladocs)
(the zero-install Markdown **preview** server). Use `sladocs` to preview locally
and `sladocs-build` to ship a static build.

## Usage

```sh
npx sladocs-build ./docs --out ./site
```

Then serve `./site` with any static file server:

```sh
npx serve ./site
```

### Options

| Option | Description |
| --- | --- |
| `[dirs...]` | Directories to build (default: current directory) |
| `-o, --out <dir>` | Output directory (required) |
| `--base-path <path>` | Subpath the site is served from, e.g. `/repo/` (default `/`) |

A `sladocs.json` config file (if any) is read from the directory you run the
command in, the same as `sladocs`.

### Subpath hosting

When the site is not served from the domain root (e.g. a GitHub project page at
`https://user.github.io/repo/`), pass `--base-path /repo/`. All links, assets,
and the asset routes are rewritten to that prefix. Place the whole output
directory under that subpath when serving.

## GitHub Pages

See [`examples/github-pages.yml`](./examples/github-pages.yml) for a ready-to-use
workflow that builds the site and publishes it to GitHub Pages, with npm caching
so the build dependencies are only downloaded once.

## License

MIT
