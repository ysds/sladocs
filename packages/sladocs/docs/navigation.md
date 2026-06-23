---
title: Navigation
description: Control the sidebar with meta.json and frontmatter.
icon: ListTree
---

The sidebar, table of contents, and page titles are built from two sources.

- The **frontmatter** at the top of each `.md` page.
- A **`meta.json`** file placed in any folder.

Both use the same schema as fumadocs, so an existing fumadocs content tree works as-is.

## Frontmatter

Each page can declare its own metadata.

```md
---
title: Getting Started
description: Preview any directory of Markdown in seconds.
icon: Rocket
---

Page body starts here.
```

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | Defaults to the file name without its extension if not set. |
| `description` | `string` | Used on the index page and in the `<meta>` description. |
| `icon` | `string` | A [Lucide](https://lucide.dev) icon name (e.g. `FileText`). |

Frontmatter is parsed as YAML.

## `meta.json`

Place a `meta.json` in any folder to control how it appears in the sidebar.

```json
{
  "title": "Guides",
  "description": "Long-form how-to articles",
  "icon": "BookOpen",
  "pages": [
    "getting-started",
    "configuration",
    "---Advanced---",
    "navigation",
    "markdown"
  ],
  "defaultOpen": true
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | The folder's label in the sidebar. |
| `description` | `string` | Tooltip / description. |
| `icon` | `string` | A Lucide icon name. |
| `pages` | `string[]` | The order of children. Each entry is a file name without its extension, or a folder name. |
| `defaultOpen` | `boolean` | Expand the folder by default. |
| `root` | `boolean` | Treat this folder as a standalone section (with its own header). |

### Ordering with `pages`

Without `pages`, entries are sorted alphabetically. To control the order, list them explicitly.

```json
{
  "pages": ["index", "install", "first-steps"]
}
```

The names are file or subfolder names, not titles. Use `"..."` to splice in any entries you didn't list.

```json
{
  "pages": ["index", "install", "..."]
}
```

### Separators

A string wrapped in `---` becomes a non-clickable label between entries.

```json
{
  "pages": [
    "intro",
    "---Setup---",
    "install",
    "config"
  ]
}
```

A bare `"---"` renders a thin divider.

## Validation errors

A `meta.json` that fails to parse (broken JSON, or a wrong field type such as `"title": 123`) and frontmatter that doesn't validate don't fail silently: an error banner at the top of every page lists the file and the problem. Pages with invalid frontmatter still render, falling back to defaults. Fix the file and the banner disappears with the next hot reload.

## Multi-project tabs

When you configure two or more projects in [Configuration](./configuration#projects), each project becomes a **tab** at the top of the sidebar. Switching tabs shows only that project's tree, and the project's slug (derived from `name`) is prefixed to every page URL (e.g. `/guides/install`).

```json
{
  "projects": [
    { "name": "Guides", "dir": "./docs" },
    { "name": "Blog",   "dir": "./blog" }
  ]
}
```

Each project's top-level `meta.json` is automatically treated as a section root (`"root": true`), so you don't need to write that yourself.

### A tab's landing page

What appears at the top of a tab (`/{slug}`) depends on whether there's an `index.md` directly under the project.

- **With `index.md`** — it becomes the tab's landing page.
- **Without `index.md`** — an auto-generated list of the project's pages is shown at the top of the tab, even when every page lives in a subfolder. It does not become the "non-clickable group" described in [Index pages](#index-pages).

## Icons

Both frontmatter and `meta.json` accept a [Lucide](https://lucide.dev) icon name as a string.

```yaml
icon: FileText
```

When set, a small icon appears to the left of the corresponding entry's label in the **sidebar**. A frontmatter `icon` attaches to that page's link, and a `meta.json` `icon` attaches to that folder's (or section root's) label. Icons appear only in the sidebar and do not affect headings in the page body. If unset, nothing is shown.

Icon names must match those in [Lucide](https://lucide.dev) (case-sensitive too). A name that can't be resolved shows no icon for that entry and logs a warning at startup. Icons are resolved lazily, and only the ones you actually reference are loaded.

## Index pages

When you visit the URL of a folder name itself (e.g. `/guides`), if `guides/index.md` exists that page opens. This is the folder's **landing page**.

A folder without an `index.md` becomes a **non-clickable group** with no URL. The folder name appears in the sidebar, but clicking it only expands or collapses it — there is no page to show.

Only directly under a project tab ([Multi-project tabs](#multi-project-tabs)) is the behavior different: even without an `index.md` it does not become a non-clickable group, and an automatically generated page list is shown at the top of the tab.
