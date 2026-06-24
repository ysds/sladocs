---
title: 静的ビルド
description: sladocs-build でドキュメントを静的サイトとして公開する。
icon: Globe
---

sladocs は Markdown をローカルでプレビューするツールです。姉妹 CLI の [`sladocs-build`](https://www.npmjs.com/package/sladocs-build) を使うことで静的ビルドできます。

```bash
npx sladocs-build ./docs --out ./site
```

出力は、好きな静的ファイルサーバーで配信できます。

```bash
npx serve ./site
```

> [!NOTE]
> `sladocs-build` はビルドツールチェーン一式を同梱しているため、初回のダウンロードは sladocs より大きくなります。普段のプレビューは sladocs を使い、ビルドするときのみ `sladocs-build` を使うのがよいでしょう。

## サブパスで公開する

サイトをドメインのルート以外で配信する場合、たとえば `https://user.github.io/repo/` のようなサブパスで配信する場合は `--base-path` を渡します。リンク・アセット・アセットのルートが、すべてそのプレフィックスに書き換えられます。

```bash
npx sladocs-build ./docs --out ./site --base-path /repo/
```

## GitHub Pages

すぐ使えるワークフローが、パッケージ内の [`examples/github-pages.yml`](https://github.com/ysds/sladocs/blob/main/packages/sladocs-build/examples/github-pages.yml) にあります。サイトをビルドし、公式の Pages アクションでデプロイするものです。これらのアクションは出力を（`_app` ディレクトリも含めて）そのまま配信するので、`.nojekyll` はいりません。

代わりに `gh-pages` ブランチへ公開する場合は、Jekyll が `_app` を飛ばさないように、出力に空の `.nojekyll` を追加してください（`touch ./site/.nojekyll`）。

## CLI リファレンス

```text
sladocs-build [dirs...] --out <dir> [options]
```

### 引数

| 引数 | 説明 |
| --- | --- |
| `dirs...` | ビルドするディレクトリ。指定の仕方は `sladocs` と同じです。省略するとカレントディレクトリが対象になり、複数指定するとマルチプロジェクト（タブ付き）のサイトをビルドします。`sladocs.json` に `projects` がある場合は無視されます。 |

### オプション

| フラグ | 短縮 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `--out <dir>` | `-o` | – | 出力先のディレクトリ。必須です。 |
| `--base-path <path>` | – | `/` | サイトを配信するサブパス。例: `/repo/`。 |
| `--version` | `-v` | – | インストール済みのバージョンを表示します。 |
| `--help` | `-h` | – | 使い方を表示します。 |
