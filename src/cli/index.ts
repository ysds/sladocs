#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { baseDir } from '../constants.js';
import { getFreePort } from './port.js';

const require = createRequire(import.meta.url);
const { version } = require(
  path.join(baseDir, 'package.json'),
) as { version: string };

const program = new Command();

program
  .name('sladocs')
  .description('Zero-install Markdown preview server')
  .version(version, '-v, --version', 'output the version number')
  .argument('[dirs...]', 'directories to preview (default: cwd)')
  .option('-p, --port <port>', 'port to listen on')
  .option('-H, --host <host>', 'host to bind to', 'localhost')
  .option('--no-watch', 'disable file watching and hot reload')
  .action(
    async (
      dirs: string[],
      opts: { port?: string; host: string; watch: boolean },
    ) => {
      const startPort = opts.port ? parseInt(opts.port, 10) : 8080;
      const port = await getFreePort(startPort, opts.host);

      process.env.ROOT_DIR = process.cwd();
      process.env.HOST = opts.host;
      process.env.PORT = String(port);
      if (opts.watch) process.env.HOT_RELOAD = '1';

      const targets = dirs.length > 0 ? dirs : [''];
      process.env.DEFAULT_PROJECT_DIR = JSON.stringify(
        targets.map((dir) => path.resolve(dir)),
      );

      const serveFile = pathToFileURL(
        path.resolve(baseDir, 'dist', 'waku', 'serve-node.js'),
      ).href;
      process.chdir(baseDir);
      await import(serveFile);

      console.log(`ready: http://${opts.host}:${port}/`);
    },
  );

program
  .command('export')
  .description('Export static HTML for deployment')
  .argument('[dirs...]', 'directories to export (default: cwd)')
  .option('-o, --out <dir>', 'output directory', './out')
  .action(
    async (dirs: string[], opts: { out: string }) => {
      const { runExport } = await import('./export.js');
      await runExport(dirs, opts.out, baseDir);
    },
  );

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
