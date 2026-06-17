import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidable } from './revalidable.js';

async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('revalidable', () => {
  it('creates once and caches per argument set', () => {
    const create = vi.fn((n: number) => ({ value: n * 2 }));
    const fn = revalidable({ create });

    const first = fn(2);
    expect(fn(2)).toBe(first);
    expect(fn(3)).toEqual({ value: 6 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('never goes stale without staleTime', () => {
    const create = vi.fn(() => ({}));
    const fn = revalidable({ create });

    const first = fn();
    vi.advanceTimersByTime(1_000_000);
    expect(fn()).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('recreates synchronously once staleTime has elapsed', () => {
    const create = vi.fn().mockReturnValueOnce('a').mockReturnValueOnce('b');
    const fn = revalidable({ staleTime: 1000, create });

    expect(fn()).toBe('a');
    vi.advanceTimersByTime(999);
    expect(fn()).toBe('a');
    vi.advanceTimersByTime(1);
    expect(fn()).toBe('b');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('serves the stale value while an async revalidation is in flight', async () => {
    let resolveNext!: (value: string) => void;
    const create = vi
      .fn()
      .mockReturnValueOnce(Promise.resolve('a'))
      .mockReturnValueOnce(new Promise<string>((resolve) => (resolveNext = resolve)));
    const fn = revalidable({ staleTime: 1000, create });

    await expect(fn()).resolves.toBe('a');
    vi.advanceTimersByTime(1000);

    // Kicks off revalidation but still resolves to the old value.
    await expect(fn()).resolves.toBe('a');
    // Only one revalidation runs at a time.
    await expect(fn()).resolves.toBe('a');
    expect(create).toHaveBeenCalledTimes(2);

    resolveNext('b');
    await Promise.resolve();
    await Promise.resolve();
    expect(fn()).toBe('b');
  });

  it('revalidate(true) marks entries stale', () => {
    const create = vi.fn().mockReturnValueOnce('a').mockReturnValueOnce('b');
    const fn = revalidable({ staleTime: 1000, create });

    expect(fn()).toBe('a');
    fn.revalidate(true);
    expect(fn()).toBe('b');
  });

  it('revalidate(false) drops entries entirely', () => {
    const create = vi.fn().mockReturnValueOnce('a').mockReturnValueOnce('b');
    const fn = revalidable({ staleTime: 1000, create });

    expect(fn()).toBe('a');
    fn.revalidate(false);
    expect(fn()).toBe('b');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('shares one entry across arguments with a custom cacheKey', () => {
    const create = vi.fn((n: number) => n * 2);
    const fn = revalidable({ create, cacheKey: () => 'fixed' });

    expect(fn(2)).toBe(4);
    expect(fn(3)).toBe(4);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries creation after an initial rejection', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');
    const fn = revalidable({ create });

    await expect(fn()).rejects.toThrow('boom');
    await flushMicrotasks();
    await expect(fn()).resolves.toBe('ok');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('keeps the stale value when async revalidation rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi
      .fn()
      .mockResolvedValueOnce('a')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('b');
    const fn = revalidable({ staleTime: 1000, create });

    await expect(fn()).resolves.toBe('a');
    vi.advanceTimersByTime(1000);
    // Kicks off the failing revalidation but still resolves to the old value.
    await expect(fn()).resolves.toBe('a');
    await flushMicrotasks();

    // Still serves the old value; no retry within the same staleTime window.
    await expect(fn()).resolves.toBe('a');
    expect(create).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();

    // The next staleTime window retries and succeeds.
    vi.advanceTimersByTime(1000);
    await expect(fn()).resolves.toBe('a');
    await flushMicrotasks();
    // After a successful revalidation lastResult holds the resolved value, not
    // a promise (same as the existing in-flight test).
    expect(fn()).toBe('b');
    expect(create).toHaveBeenCalledTimes(3);
    errorSpy.mockRestore();
  });
});
