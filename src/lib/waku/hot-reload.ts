import { z } from 'zod';

const Revalidate = z.object({
  type: z.literal('revalidate'),
});

// Config changes affect site-wide structure (navigation, search index), which
// a single-route refetch cannot capture, so the client does a full reload.
const FullReload = z.object({
  type: z.literal('full-reload'),
});

export const WebSocketEventSchema = z.discriminatedUnion('type', [Revalidate, FullReload]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;

export function encodeEvent(event: WebSocketEvent): string {
  return JSON.stringify(event);
}

export function decodeEvent(raw: string): WebSocketEvent | undefined {
  try {
    return WebSocketEventSchema.safeParse(JSON.parse(raw)).data;
  } catch {
    return undefined;
  }
}
