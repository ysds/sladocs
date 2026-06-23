import type { ReactNode, CSSProperties } from 'react';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Provider } from '@/components/provider.js';
import { HotReload } from '@/components/hot-reload.js';
import { unstable_getRequest as getRequest } from 'waku/router/server';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { localeFromPathname } from '@/lib/source/i18n.js';
import { RootMeta } from '@/lib/meta.js';
import { isStatic } from '@/lib/env.js';

export default async function RootElement({ children }: { children: ReactNode }) {
  const config = await getConfigRuntime();
  const primary = config.color.primary;
  const style = primary
    ? ({ '--color-fd-primary': primary } as CSSProperties)
    : undefined;

  const locale = config.i18n
    ? localeFromPathname(requestPathname(), config.i18n)
    : undefined;

  return (
    <html lang={locale ?? 'en'} suppressHydrationWarning>
      <head>
        <RootMeta config={config} />
      </head>
      <body
        className="flex flex-col min-h-screen antialiased"
        style={style}
      >
        <Provider i18n={config.i18n} searchEnabled={!isStatic()}>
          {children}
        </Provider>
        {!isStatic() && <HotReload />}
      </body>
    </html>
  );
}

function requestPathname(): string {
  try {
    return new URL(getRequest().url).pathname;
  } catch {
    return '/';
  }
}

export async function getConfig() {
  return { render: isStatic() ? 'static' : 'dynamic' } as const;
}
