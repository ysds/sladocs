'use client';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import { RootProvider } from '@fumadocs/base-ui/provider/waku';
import { I18nProvider } from '@fumadocs/base-ui/contexts/i18n';
import type { I18nConfig } from '@/config/schema.js';
import { localeFromPathname, localeName, localePrefix } from '@/lib/source/i18n.js';

interface ProviderProps {
  children: ReactNode;
  i18n?: I18nConfig;
}

export function Provider({ children, i18n }: ProviderProps) {
  return (
    <RootProvider>
      {i18n ? (
        // Nest our own I18nProvider inside RootProvider so the locale-switch
        // handler can use the framework router hooks, which only resolve below
        // RootProvider's FrameworkProvider.
        <LocaleProvider i18n={i18n}>{children}</LocaleProvider>
      ) : (
        children
      )}
    </RootProvider>
  );
}

function LocaleProvider({ i18n, children }: { i18n: I18nConfig; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const locales = i18n.languages.map((l) => ({ locale: l, name: localeName(l, i18n) }));

  // The current locale is derived from the live pathname, not a server-rendered
  // prop: that prop is fixed at SSR and goes stale across client-side
  // navigations. Using it for the switcher selection would leave the highlight
  // showing the locale of the *first* page loaded — e.g. after landing on a
  // `/ja/...` page that falls back to English content, then navigating to a page
  // that does have a Japanese translation, the switcher would wrongly stay on
  // English. The URL is the source of truth for "which locale am I viewing".
  const locale = localeFromPathname(pathname, i18n);

  // The built-in redirect assumes every locale carries a URL prefix, which is
  // wrong when the default language has none. Strip the current locale prefix
  // and apply the target's, keeping the rest of the path.
  const onLocaleChange = (next: string) => {
    const prefix = localePrefix(locale, i18n);
    const rest = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
    const target = localePrefix(next, i18n) + rest;
    router.push(target || '/');
  };

  return (
    <I18nProvider locale={locale} locales={locales} onLocaleChange={onLocaleChange}>
      {children}
    </I18nProvider>
  );
}
