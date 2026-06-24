---
title: 設定
description: サイトのメタデータや複数プロジェクトを指定する、任意の JSON / YAML 設定。
icon: Settings
---

sladocs は設定なしで動きますが、ドキュメントの隣に JSON か YAML のファイルを配置することで細かい設定ができます。

## ファイル名

起動時、sladocs はワーキングディレクトリで次のファイルを順に探し、最初に見つかったものを使います。

1. `sladocs.json`
2. `sladocs.yaml`
3. `sladocs.yml`

どれも見つからなければ、既定値で動きます。

## スキーマ全体

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

どのフィールドも任意です。`site` ごと省略してもかまいません。

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `title` | `string` | `"sladocs"` | サイドバーと `<title>` に表示されます。 |
| `description` | `string` | – | ホームページに表示され、meta description の既定値にもなります。 |
| `logo` | `string` | – | パスまたは URL。省略すると組み込みのマークになります。 |
| `github` | `string`（URL） | – | サイドバーに「GitHub」リンクを追加します。 |
| `url` | `string`（URL） | – | 公開したサイトのベース URL。`og:url`・`canonical`・`og:image` を絶対 URL で出力するのに必要です。 |
| `ogImage` | `string` | – | SNS シェア用の画像。プロジェクトディレクトリからの相対パス（`/api/asset` 経由で配信）か、絶対 URL を指定します。`url` があれば絶対 URL に変換されます。 |
| `favicon` | `string` | – | ファビコン。プロジェクトディレクトリからの相対パスか、絶対 URL。 |

### `projects`

ドキュメントルートを複数指定すると、「マルチプロジェクト表示」になります。`projects` を省略した場合は、ワーキングディレクトリを 1 つのプロジェクトとして扱います。

```json
{
  "projects": [
    { "dir": ".", "exclude": ["drafts/**"] }
  ]
}
```

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `name` | `string` | `dir` のベース名 | タブのラベルとスラッグのもとになります。 |
| `dir` | `string` | **必須** | 設定ファイルからの相対で解決します。 |
| `include` | `string[]` | `["**/*.{md,mdx}", "**/meta.json"]` | 集めるファイルの tinyglobby パターン。 |
| `exclude` | `string[]` | – | 集める対象から外す tinyglobby パターン。git で無視されるファイルに**加えて**適用されます。`include` と重なった場合は `exclude` が優先されます。 |

プロジェクトを 2 つ以上指定すると、それぞれがサイドバー上部のタブ（ドロップダウン）になり、そのスラッグがすべてのページ URL の先頭に付きます。

### `exclude`（トップレベル）

トップレベルの `exclude` は、パターンを一度書くだけで、すべてのプロジェクトの `exclude` にマージされます。`CLAUDE.md` やテンプレートのような共通パターンを、プロジェクトごとに繰り返さずに済みます。

```json
{
  "exclude": ["**/AGENT.md", "_template.md"],
  "projects": [{ "dir": "./docs", "exclude": ["drafts/**"] }]
}
```

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `exclude` | `string[]` | – | 各プロジェクトの `exclude` の前に足される tinyglobby パターン。プロジェクト自身の `exclude` はその後に適用されます。 |

上の例では、`docs` プロジェクトは実質的に `["**/AGENT.md", "_template.md", "drafts/**"]` を除外します。

### `color`

サイトのテーマカラーを上書きします。どのフィールドも任意で、`color` ごと省略すると組み込みのテーマカラーがそのまま使われます。

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `primary` | `string` | – | テーマのプライマリカラー（CSS 変数 `--color-fd-primary`）を上書きします。サイドバーのアクティブ項目やリンクなどに使われます。 |

`primary` には任意の CSS カラー値を指定できます（`#7c3aed` のような hex、`hsl(...)`、`oklch(...)`、CSS のカラー名など）。指定した色は、ライトモードとダークモードの両方に適用されます。

```json
{
  "color": { "primary": "#7c3aed" }
}
```

### `markdown`

Markdown の処理で、ソース内の生 HTML をどう扱うかを決めます。

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `allowDangerousHtml` | `"off"` \| `"safe"` \| `"all"` | `"safe"` | [インライン HTML](./markdown.ja.md#インライン-html) を参照。 |

- `"safe"` — 生 HTML をレンダリングしつつ、GFM のタグフィルターが危険なタグ（`iframe`、`script`、`style` など）をプレーンテキストに変換します。GitHub の Web 表示と同じです。
- `"off"` — 生 HTML をすべて捨てます。出力に Markdown の記法だけを反映したいときに使います。
- `"all"` — フィルターなしでレンダリングします。`<script>` や `<iframe>` も実行されるので、すべてのソースが信頼できるときだけ使ってください。

### `frontmatter`

ページのフロントマターから、ページタイトルと本文のあいだに表示するメタデータ表を作ります。見せたいフロントマターを `fields` に指定します。`frontmatter` ごと省略すれば、表は出ません。

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

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `fields` | `Field[]` | – | 表示するフロントマターのフィールドを、出したい順に並べます。各要素のフィールドは下記のとおりです。 |

`fields` の各要素:

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | **必須** | 読み取るフロントマターのキー。 |
| `label` | `string` | `key` | 左の列に出すラベル。 |
| `style` | `"text"` \| `"badge"` | `"text"` | 値の表示方法。 |

- `"text"` — プレーンテキスト。配列の値はカンマでつなぎます。
- `"badge"` — 塗りつぶしのチップ。配列の値は要素ごとに 1 つのチップになります。

空の値（未設定、`null`、`""`、空の配列）の場合、その行は出力されません。`Date` の値は `YYYY-MM-DD` の形式で表示します。

### `i18n`

多言語ドキュメントを使いたいときだけ指定します。`i18n` を省略すれば、すべて単一言語として振る舞います。指定すると、サイドバーに言語の切り替えが現れ、ページがロケールごとに配信されます。

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `languages` | `string[]` | **必須** | 対応するロケールコード。例: `["en", "ja"]`。 |
| `defaultLanguage` | `string` | **必須** | `languages` のいずれかである必要があります。プレフィックスなしの URL で配信されます。 |
| `parser` | `"dot"` \| `"dir"` | `"dot"` | ローカライズしたファイルの名付け方。下記を参照。 |
| `names` | `Record<string, string>` | – | 言語切り替えのラベルをロケールごとに上書きします。省略すると各言語の自称（`ja` → `日本語`）が使われます。 |

既定の言語には URL のプレフィックスが付きません（`/guide`）。それ以外の言語にはプレフィックスが付きます（`/ja/guide`）。

ファイルはロケールごとに名付けます。既定の `"dot"` パーサーでは、拡張子の前に `.{locale}` を足します。既定の言語はサフィックスなしのままです。

```text
docs/
├── guide.md          # en (default)
├── guide.ja.md       # ja
├── meta.json         # en navigation
└── meta.ja.json      # ja navigation
```

`"dir"` パーサーでは、言語ごとのフォルダで分けます（`en/guide.md`、`ja/guide.md`）。翻訳のないページは、既定の言語にフォールバックします。

## よくある設定例

### タイトルを変えた単一のドキュメントフォルダ

```json
{
  "site": {
    "title": "Acme Handbook",
    "github": "https://github.com/acme/handbook"
  }
}
```

`npx sladocs ./docs` で実行します。`dir` は CLI の引数から渡します。

### 名前付きのタブを 2 つ

```json
{
  "site": { "title": "Acme" },
  "projects": [
    { "name": "Guides", "dir": "./docs" },
    { "name": "Blog",   "dir": "./blog" }
  ]
}
```

`npx sladocs`（引数なし）で実行します。プロジェクトは設定から読み込まれます。

### JSON ではなく YAML で書く

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
