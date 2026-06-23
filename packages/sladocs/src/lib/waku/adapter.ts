import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono/tiny';
import type { MiddlewareHandler } from 'hono';
import { createNodeWebSocket } from '@hono/node-ws';
import { watch } from 'chokidar';
import type { WSContext } from 'hono/ws';
import { unstable_createServerEntryAdapter as createServerEntryAdapter } from 'waku/adapter-builders';
import {
  unstable_constants as constants,
  unstable_honoMiddleware as honoMiddleware,
} from 'waku/internals';
import type { BuildOptions } from 'waku/adapters/node-build-enhancer';
import { findConfigPath } from '@/config/load-node.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { filesCache } from '../source/storage.js';
import { getSource } from '../source/index.js';
import { startWatcher } from '../source/watcher.js';
import { encodeEvent, type WebSocketEvent } from './hot-reload.js';

const { DIST_PUBLIC } = constants;
const { contextMiddleware, rscMiddleware, middlewareRunner } = honoMiddleware;

export default createServerEntryAdapter(
  (
    { processRequest, processBuild, config, isBuild, notFoundHtml },
    options?: {
      middlewareFns?: (() => MiddlewareHandler)[];
      middlewareModules?: Record<string, () => Promise<unknown>>;
    },
  ) => {
    const { middlewareFns = [], middlewareModules = {} } = options ?? {};
    const app = new Hono();
    let serveFn = serve;

    app.notFound((c) => {
      if (notFoundHtml) return c.html(notFoundHtml, 404);
      return c.text('404 Not Found', 404);
    });

    if (isBuild) {
      app.use(
        `${config.basePath}*`,
        serveStatic({
          root: path.join(config.distDir, DIST_PUBLIC),
          rewriteRequestPath: (p) => p.slice(config.basePath.length - 1),
        }),
      );
    }

    if (isBuild && process.env.HOT_RELOAD === '1') {
      const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
      const clients = new Set<WSContext>();
      // Cleanup callbacks registered by initHotReload (watchers), invoked on shutdown.
      const closers: (() => unknown)[] = [];

      void initHotReload(clients, closers).catch((e) => {
        console.error(e);
        process.exit(1);
      });

      app.get(
        '/_ws',
        upgradeWebSocket(() => ({
          onOpen(_, ws) {
            clients.add(ws);
          },
          onClose(_, ws) {
            clients.delete(ws);
          },
        })),
      );

      serveFn = (...args) => {
        const server = serve(...args);
        injectWebSocket(server);

        const shutdown = () => {
          // Close WS clients first so browsers receive a close frame and their
          // reconnect backoff starts cleanly.
          for (const client of clients) client.close();
          for (const close of closers) void close();
          server.close();
          // `http.Server#close()` does not drop established connections.
          if ('closeAllConnections' in server) {
            (server as import('node:http').Server).closeAllConnections();
          }
          // Failsafe: never hang on a lingering handle.
          setTimeout(() => process.exit(0), 3000).unref();
        };
        for (const signal of ['SIGTERM', 'SIGINT'] as const) {
          process.once(signal, shutdown);
        }
        return server;
      };
    }

    app.use(contextMiddleware() as never);
    for (const fn of middlewareFns) app.use(fn());
    app.use(middlewareRunner(middlewareModules as never) as never);
    app.use(rscMiddleware({ processRequest }) as never);

    const buildOptions: BuildOptions = { distDir: config.distDir };

    return {
      fetch: app.fetch,
      build: processBuild,
      buildOptions,
      buildEnhancers: ['waku/adapters/node-build-enhancer'],
      serve: serveFn,
    };
  },
);

async function initHotReload(clients: Set<WSContext>, closers: (() => unknown)[]) {
  function send(event: WebSocketEvent) {
    const encoded = encodeEvent(event);
    for (const client of clients) client.send(encoded);
  }

  let watcher = await setupWatcher();

  // Watch the config file separately: it usually lives outside the project
  // directories, and changing it can alter which directories are watched.
  const configPath = findConfigPath();
  const configWatcher = configPath
    ? watch(configPath, { ignoreInitial: true }).on('change', () => {
        void reloadConfig();
      })
    : undefined;

  // `watcher` is reassigned on config reload; close whichever is current.
  closers.push(() => watcher.close());
  if (configWatcher) closers.push(() => configWatcher.close());

  async function setupWatcher() {
    const next = await startWatcher(await getConfigRuntime());
    // The cache is self-validating (mtime/size); the watcher only needs to tell
    // the source loader and browsers to refetch.
    next.on('all', (event) => {
      if (event === 'add' || event === 'change' || event === 'unlink') {
        getSource.revalidate(false);
        send({ type: 'revalidate' });
      }
    });
    return next;
  }

  // Config changes can add/remove projects, so rebuild the watcher from the
  // fresh config and force the source/page cache to regenerate.
  async function reloadConfig() {
    getConfigRuntime.revalidate(false);
    filesCache.clear();
    getSource.revalidate(false);
    await watcher.close();
    watcher = await setupWatcher();
    send({ type: 'full-reload' });
  }
}
