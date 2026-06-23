const refMap = new WeakMap<object, string>();
let nextRefId = 0;

export function hash(value: unknown): string {
  if (typeof value === 'boolean') return value ? '1:' : '0:';
  if (value === null) return 'n:';
  if (value === undefined) return 'u:';

  if (Array.isArray(value)) {
    return `a:${value.map(hash).join('\0')}`;
  }

  if (typeof value === 'object') {
    const cached = refMap.get(value);
    if (cached) return cached;
    const id = `o:${nextRefId++}`;
    refMap.set(value, id);
    return id;
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new Error('not supported');
  }

  return `${typeof value}:${value}`.replaceAll('\0', '');
}
