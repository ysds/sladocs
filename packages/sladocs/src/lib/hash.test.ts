import { describe, expect, it } from 'vitest';
import { hash } from './hash.js';

describe('hash', () => {
  it('hashes primitives by type and value', () => {
    expect(hash(true)).toBe('1:');
    expect(hash(false)).toBe('0:');
    expect(hash(null)).toBe('n:');
    expect(hash(undefined)).toBe('u:');
    expect(hash(1)).toBe('number:1');
    expect(hash('a')).toBe('string:a');
  });

  it('distinguishes equal-looking values of different types', () => {
    expect(hash('1')).not.toBe(hash(1));
    expect(hash('null')).not.toBe(hash(null));
  });

  it('hashes equal arrays of primitives equally', () => {
    expect(hash([1, 'a', true])).toBe(hash([1, 'a', true]));
    expect(hash([1, 2])).not.toBe(hash([2, 1]));
  });

  it('hashes objects by identity', () => {
    const obj = { a: 1 };
    expect(hash(obj)).toBe(hash(obj));
    expect(hash({ a: 1 })).not.toBe(hash({ a: 1 }));
    expect(hash([obj])).toBe(hash([obj]));
  });

  it('strips NUL bytes from string values', () => {
    expect(hash('a\0b')).toBe(hash('ab'));
  });

  it('throws for functions and symbols', () => {
    expect(() => hash(() => {})).toThrow();
    expect(() => hash(Symbol('x'))).toThrow();
  });
});
