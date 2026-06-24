# sladocs-build

## 0.4.0

### Patch Changes

- Updated dependencies [[`a76474b`](https://github.com/ysds/sladocs/commit/a76474b9659a2caea89b63254b7fe4de25d8a279), [`a76474b`](https://github.com/ysds/sladocs/commit/a76474b9659a2caea89b63254b7fe4de25d8a279)]:
  - sladocs@0.4.0

## 0.3.0

### Minor Changes

- [#7](https://github.com/ysds/sladocs/pull/7) [`b5ddf48`](https://github.com/ysds/sladocs/commit/b5ddf4829c71fdbb86cce4976ae90f07b6aecec3) Thanks [@ysds](https://github.com/ysds)! - Add static site generation. `sladocs-build` is a new package that builds a
  static documentation site from Markdown/MDX and hosts it on any web server:
  `--base-path` for subpath hosting, referenced-asset copying, and i18n. Run it
  with `npx sladocs-build`.

  The repository is now a pnpm workspace. The build logic lives in `sladocs`
  (next to the app source and `waku.config.ts` that `waku build` needs), so
  `sladocs-build` is only a small launcher that delegates to it — but it bundles
  the full build toolchain (vite/waku/tailwind/fumadocs), so its install is
  heavy. This split keeps `sladocs` (the preview server) lightweight while the
  heavy dependencies stay confined to `sladocs-build`.

### Patch Changes

- [#9](https://github.com/ysds/sladocs/pull/9) [`017b385`](https://github.com/ysds/sladocs/commit/017b3855b886439c296419e17c3053d991c6405c) Thanks [@ysds](https://github.com/ysds)! - Upgrade waku to 1.0.0-beta.3. Adapts the custom Node adapter and root layout to
  the beta's API changes (`unstable_getRequest` replaces `unstable_getContext`,
  and the hono middleware helpers now take an `{ app }` argument).
- Updated dependencies [[`b5ddf48`](https://github.com/ysds/sladocs/commit/b5ddf4829c71fdbb86cce4976ae90f07b6aecec3), [`017b385`](https://github.com/ysds/sladocs/commit/017b3855b886439c296419e17c3053d991c6405c)]:
  - sladocs@0.3.0
