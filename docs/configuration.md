---
title: Configuration
description: Optional JSON / YAML configuration for site metadata and multiple projects.
icon: Settings
---

`sladocs` works with no configuration. When the defaults aren't enough — multiple documentation roots, a site title, a GitHub link, and so on — place a single JSON or YAML file next to your docs.

## File name

At startup, `sladocs` looks in the working directory for these files in order and uses the first one it finds.

1. `sladocs.json`
2. `sladocs.yaml`
3. `sladocs.yml`

If none is found, it runs with the defaults.

## Full schema

```json
{
  "site": {
    "title": "My Project",
    "description": "Project docs and guides",
    "logo": "./logo.svg",
    "github": "https://github.com/ysds/my-project",
    "url": "https://my-project.example.com",
    "ogImage": "og-image.png",
    "favicon": "favicon.ico"
  },
  "exclude": ["**/AGENT.md", "_template.md"],
  "projects": [
    {
      "name": "Guides",
      "dir": "./docs",
      "include": ["**/*.{md,mdx}", "**/meta.json"],
      "exclude": ["drafts/**"]
    }
  ],
  "color": {
    "primary": "#7c3aed"
  },
  "markdown": {
    "allowDangerousHtml": "safe"
  },
  "frontmatter": {
    "fields": [
      { "key": "status", "label": "Status", "style": "badge" },
      { "key": "author", "label": "Author" }
    ]
  },
  "i18n": {
    "languages": ["en", "ja"],
    "defaultLanguage": "en",
    "parser": "dot",
    "names": { "en": "English", "ja": "日本語" }
  }
}
```

### `site`

Every field is optional. You can omit `site` entirely.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | `string` | `"sladocs"` | Shown in the sidebar and the `<title>`. |
| `description` | `string` | – | Shown on the home page and used as the default meta description. |
| `logo` | `string` | – | A path or URL. Defaults to the built-in mark if not set. |
| `github` | `string` (URL) | – | Adds a "GitHub" link to the sidebar. |
| `url` | `string` (URL) | – | Public base URL of the deployed site. Required to emit absolute `og:url`, `canonical`, and absolute `og:image` tags. |
| `ogImage` | `string` | – | Social-share image. A path relative to the project dir (served via `/api/asset`) or an absolute URL. Made absolute with `url`. |
| `favicon` | `string` | – | Favicon. A path relative to the project dir or an absolute URL. |

### `projects`

Specify multiple documentation roots to enable the "multi-project layout." You can also use it with a single folder to narrow what gets collected. If you omit `projects` entirely, the working directory is treated as a single project.

```json
{
  "projects": [
    { "dir": ".", "exclude": ["drafts/**"] }
  ]
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `name` | `string` | the base name of `dir` | The source of the tab label and slug. |
| `dir` | `string` | **required** | Resolved relative to the configuration file. |
| `include` | `string[]` | `["**/*.{md,mdx}", "**/meta.json"]` | tinyglobby patterns for the files to collect. |
| `exclude` | `string[]` | – | tinyglobby patterns to exclude from collection, **in addition to** git-ignored files. When it overlaps `include`, `exclude` wins. |

When you configure two or more projects, each becomes a tab (dropdown) at the top of the sidebar, and its slug is prefixed to every page URL.

### `exclude` (top-level)

A top-level `exclude` declares patterns once and merges them into every project's `exclude` list, so shared patterns like `CLAUDE.md` or template files don't have to be repeated per project.

```json
{
  "exclude": ["**/CLAUDE.md", "_template.md"],
  "projects": [{ "dir": "./docs", "exclude": ["drafts/**"] }]
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `exclude` | `string[]` | – | tinyglobby patterns prepended to every project's `exclude`. A project's own `exclude` is applied after these. |

In the example above, the `docs` project effectively excludes `["**/CLAUDE.md", "_template.md", "drafts/**"]`.

### `color`

Override the site's theme color. Every field is optional; if you omit `color` entirely, the built-in theme colors are used as-is.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `primary` | `string` | – | Overrides the theme's primary color (CSS variable `--color-fd-primary`). Used for active sidebar items, links, and so on. |

`primary` accepts any CSS color value (hex like `#7c3aed`, `hsl(...)`, `oklch(...)`, CSS color names, and so on). The color you set applies to both light and dark modes.

```json
{
  "color": { "primary": "#7c3aed" }
}
```

### `markdown`

Controls how the Markdown pipeline handles raw HTML inside source files.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `allowDangerousHtml` | `"off"` \| `"safe"` \| `"all"` | `"safe"` | See [Inline HTML](./markdown.md#inline-html). |

- `"safe"` — renders raw HTML while the GFM tag filter escapes unsafe tags (`iframe`, `script`, `style`, and so on) to plain text. Matches GitHub's web rendering.
- `"off"` — discards raw HTML entirely. Use this when you want only Markdown syntax reflected in the output.
- `"all"` — renders with no filter. `<script>` and `<iframe>` will also run, so use only when all sources are trusted.

### `frontmatter`

Render a metadata table from page frontmatter, shown between the page title and body. Set `fields` to the frontmatter you want surfaced; pages that lack a field simply omit that row. Omit `frontmatter` entirely and no table is rendered.

```json
{
  "frontmatter": {
    "fields": [
      { "key": "status", "label": "Status", "style": "badge" },
      { "key": "author", "label": "Author" }
    ]
  }
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `fields` | `Field[]` | – | The frontmatter fields to render, in order. Each entry has the fields below. |

Each `fields` entry:

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | `string` | **required** | The frontmatter key to read. |
| `label` | `string` | the `key` | The label shown in the left column. |
| `style` | `"text"` \| `"badge"` | `"text"` | How the value is rendered. |

- `"text"` — plain text. Array values are joined with commas.
- `"badge"` — a filled chip. Array values render as one chip per item.

Empty values (missing, `null`, `""`, or an empty array) hide the row. `Date` values are formatted as `YYYY-MM-DD`.

### `i18n`

Opt-in multilingual docs. Omit `i18n` and everything behaves as a single language. When set, a language switcher appears in the sidebar and each page is served per locale.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `languages` | `string[]` | **required** | Supported locale codes, e.g. `["en", "ja"]`. |
| `defaultLanguage` | `string` | **required** | Must be one of `languages`. Served at the unprefixed URL. |
| `parser` | `"dot"` \| `"dir"` | `"dot"` | How localized files are named. See below. |
| `names` | `Record<string, string>` | – | Override switcher labels per locale. Defaults to each language's own name (`ja` → `日本語`). |

The default language has no URL prefix (`/guide`); other languages are prefixed (`/ja/guide`).

Name your files by locale. With the default `"dot"` parser, append `.{locale}` before the extension; the default language stays unsuffixed:

```text
docs/
├── guide.md          # en (default)
├── guide.ja.md       # ja
├── meta.json         # en navigation
└── meta.ja.json      # ja navigation
```

The `"dir"` parser groups by language folder instead (`en/guide.md`, `ja/guide.md`). A page with no translation falls back to the default language.

## Common recipes

### Single docs folder with a custom title

```json
{
  "site": {
    "title": "Acme Handbook",
    "github": "https://github.com/acme/handbook"
  }
}
```

Run it with `npx sladocs ./docs`. `dir` is supplied from the CLI argument.

### Two named tabs

```json
{
  "site": { "title": "Acme" },
  "projects": [
    { "name": "Guides", "dir": "./docs" },
    { "name": "Blog",   "dir": "./blog" }
  ]
}
```

Run it with `npx sladocs` (no arguments). The projects are read from the configuration.

### YAML instead of JSON

```yaml
site:
  title: Acme Handbook
  github: https://github.com/acme/handbook

projects:
  - name: Guides
    dir: ./docs
  - name: Blog
    dir: ./blog
```
