---
"sladocs": minor
"sladocs-build": minor
---

Add static site generation. `sladocs-build` is a new package that builds a
static documentation site from Markdown/MDX and hosts it on any web server:
`--base-path` for subpath hosting, referenced-asset copying, and i18n. Run it
with `npx sladocs-build`.

The repository is now a pnpm workspace. The build logic lives in `sladocs`
(next to the app source and `waku.config.ts` that `waku build` needs), so
`sladocs-build` is only a small launcher that delegates to it — but it bundles
the full build toolchain (vite/waku/tailwind/fumadocs), so its install is
heavy. This split keeps `sladocs` (the preview server) lightweight while the
heavy dependencies stay confined to `sladocs-build`.
