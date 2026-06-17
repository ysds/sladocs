import type { ReactNode, CSSProperties } from 'react';
import { unstable_getContext as getContext } from 'waku/server';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Provider } from '@/components/provider.js';
import { HotReload } from '@/components/hot-reload.js';
import { getConfigRuntime } from '@/config/load-runtime.js';
import { localeFromPathname } from '@/lib/source/i18n.js';

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
      <head />
      <body
        className="flex flex-col min-h-screen antialiased"
        style={style}
      >
        <Provider i18n={config.i18n}>{children}</Provider>
        <HotReload />
      </body>
    </html>
  );
}

function requestPathname(): string {
  try {
    return new URL(getContext().req.url).pathname;
  } catch {
    return '/';
  }
}

export async function getConfig() {
  return { render: 'dynamic' } as const;
}
