import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { mimeFor } from './asset.js';

interface ByteRange {
  start: number;
  end: number;
}

// Single-range parser. Returns the byte range to serve, 'unsatisfiable' for a
// syntactically valid but unservable range (-> 416), or null when the header
// should be ignored (multi-range or malformed -> plain 200).
function parseRange(header: string, size: number): ByteRange | 'unsatisfiable' | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr = '', endStr = ''] = match;
  if (startStr === '' && endStr === '') return null;

  if (startStr === '') {
    // Suffix form: the last N bytes.
    const suffix = Number(endStr);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(size - suffix, 0), end: size - 1 };
  }

  const start = Number(startStr);
  const end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

function matchesEtag(header: string, etag: string): boolean {
  if (header.trim() === '*') return true;
  return header.split(',').some((tag) => tag.trim() === etag);
}

function streamFile(filePath: string, range?: ByteRange): ReadableStream<Uint8Array> {
  const stream = createReadStream(filePath, range);
  // Web-stream cancellation propagates to destroy() on Node 18+, so an
  // aborted response does not leak the file descriptor.
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

// Serve a local file honoring conditional (ETag / Last-Modified) and single
// Range requests. Preview-friendly caching: no-cache forces revalidation on
// every request, and the 304 path keeps unchanged assets transfer-free.
export async function serveFile(request: Request, filePath: string): Promise<Response> {
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new Response(null, { status: 404 });
  }
  if (!stat.isFile()) return new Response(null, { status: 404 });

  const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;
  const headers = new Headers({
    'content-type': mimeFor(filePath),
    'cache-control': 'no-cache',
    'accept-ranges': 'bytes',
    etag,
    'last-modified': new Date(stat.mtimeMs).toUTCString(),
  });

  const ifNoneMatch = request.headers.get('if-none-match');
  const ifModifiedSince = request.headers.get('if-modified-since');
  const notModified =
    ifNoneMatch !== null
      ? matchesEtag(ifNoneMatch, etag)
      : ifModifiedSince !== null &&
        // HTTP dates have second resolution; compare on whole seconds.
        Math.floor(stat.mtimeMs / 1000) * 1000 <= Date.parse(ifModifiedSince);
  if (notModified) return new Response(null, { status: 304, headers });

  const rangeHeader = request.headers.get('range');
  if (rangeHeader !== null) {
    const range = parseRange(rangeHeader, stat.size);
    if (range === 'unsatisfiable') {
      headers.set('content-range', `bytes */${stat.size}`);
      return new Response(null, { status: 416, headers });
    }
    if (range) {
      headers.set('content-range', `bytes ${range.start}-${range.end}/${stat.size}`);
      headers.set('content-length', String(range.end - range.start + 1));
      return new Response(streamFile(filePath, range), { status: 206, headers });
    }
  }

  headers.set('content-length', String(stat.size));
  return new Response(streamFile(filePath), { status: 200, headers });
}
