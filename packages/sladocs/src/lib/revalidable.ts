import { cache } from 'react';
import { hash } from './hash.js';

export interface RevalidableConfig<Args extends unknown[], O> {
  staleTime?: number;
  create: (...args: Args) => O;
  cacheKey?: (...args: Args) => string;
}

export type WithRevalidate<Args extends unknown[], O> = {
  revalidate: (keepStale?: boolean) => void;
  (...args: Args): O;
};

export function revalidable<Args extends unknown[], O>(
  config: RevalidableConfig<Args, O>,
): WithRevalidate<Args, O> {
  const { create, staleTime, cacheKey = (...args) => hash(args) } = config;

  const cacheMap = new Map<
    string,
    { lastValidated: number; lastResult: O; revalidating: boolean }
  >();

  const out = cache((...args: Args) => {
    const key = cacheKey(...args);
    const entry = cacheMap.get(key);

    if (!entry) {
      const lastResult = create(...args);
      if (lastResult instanceof Promise) {
        // Drop a rejected initial value so the next call can retry.
        lastResult.catch(() => {
          if (cacheMap.get(key)?.lastResult === lastResult) cacheMap.delete(key);
        });
      }
      cacheMap.set(key, { lastResult, lastValidated: Date.now(), revalidating: false });
      return lastResult;
    }

    const isStale = staleTime !== undefined && Date.now() - entry.lastValidated >= staleTime;
    if (!isStale || entry.revalidating) return entry.lastResult;

    const next = create(...args);
    if (next instanceof Promise) {
      entry.revalidating = true;
      void next
        .then((res) => {
          entry.lastResult = res;
        })
        .catch((e) => {
          // Keep serving the stale value; the next staleTime window retries.
          console.error('revalidation failed:', e);
        })
        .finally(() => {
          entry.lastValidated = Date.now();
          entry.revalidating = false;
        });
    } else {
      entry.lastResult = next;
      entry.lastValidated = Date.now();
    }
    return entry.lastResult;
  }) as WithRevalidate<Args, O>;

  out.revalidate = (keepStale = true) => {
    if (keepStale) {
      for (const entry of cacheMap.values()) entry.lastValidated = 0;
    } else {
      cacheMap.clear();
    }
  };

  return out;
}
