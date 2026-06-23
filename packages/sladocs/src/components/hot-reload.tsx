'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'waku';
import { useRefetch } from 'waku/minimal/client';
import { unstable_encodeRoutePath as encodeRoutePath } from 'waku/router/client';
import { decodeEvent } from '@/lib/waku/hot-reload.js';

const INITIAL_BACKOFF = 500;
const MAX_BACKOFF = 5_000;

export function HotReload() {
  const router = useRouter();
  const refetch = useRefetch();

  // Refetch the current route's RSC without touching scroll position.
  // router.reload() forces shouldScroll:true, so we call refetch directly.
  const reload = useRef<() => void>(undefined);
  reload.current = () => {
    const rscPath = encodeRoutePath(router.path);
    void refetch(rscPath, new URLSearchParams({ query: router.query }));
  };

  useEffect(() => {
    const url = new URL('/_ws', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = INITIAL_BACKOFF;
    let disposed = false;
    let hadConnection = false;

    function connect() {
      socket = new WebSocket(url);

      socket.addEventListener('open', () => {
        delay = INITIAL_BACKOFF;
        // Changes made while disconnected were missed; refetch to catch up.
        if (hadConnection) reload.current?.();
        hadConnection = true;
      });

      socket.addEventListener('message', (event) => {
        const decoded = decodeEvent(event.data);
        if (decoded?.type === 'revalidate') reload.current?.();
        else if (decoded?.type === 'full-reload') window.location.reload();
      });

      // A browser 'error' is always followed by 'close', so one handler
      // covers both failure and disconnect.
      socket.addEventListener('close', () => {
        if (disposed) return;
        timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, MAX_BACKOFF);
      });
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, []);

  return null;
}
