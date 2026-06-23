#!/usr/bin/env node
// Thin launcher: the build CLI ships in the `sladocs` package (alongside the
// app source and waku.config.ts that `waku build` needs). Resolve and run it.
// Its own argv parsing and package-root resolution take over from there, so
// `waku build` runs in node_modules/sladocs where the source lives.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const cli = require.resolve('sladocs/dist/lib/cli/build-cli.mjs');
await import(pathToFileURL(cli).href);
