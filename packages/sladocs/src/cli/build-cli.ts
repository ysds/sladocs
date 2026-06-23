#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import { Command } from 'commander';
import { baseDir } from '../constants.js';
import { runStaticBuild } from './build.js';

const require = createRequire(import.meta.url);
const { version } = require(
  path.join(baseDir, 'package.json'),
) as { version: string };

const program = new Command();

program
  .name('sladocs-build')
  .description('Build a static documentation site from Markdown')
  .version(version, '-v, --version', 'output the version number')
  .argument('[dirs...]', 'directories to build (default: cwd)')
  .requiredOption('-o, --out <dir>', 'output directory')
  .option('--base-path <path>', 'subpath the site is served from, e.g. /repo/', '/')
  .action(async (dirs: string[], opts: { out: string; basePath: string }) => {
    await runStaticBuild({ dirs, out: opts.out, basePath: opts.basePath });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
