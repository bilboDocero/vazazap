import { describe, it, expect, beforeEach } from 'vitest';
import { searchAsync, normalize, resetSearchIndex } from '../../src/lib/search.js';

describe('normalize()', () => {
  it('lowercases text', () => {
    expect(normalize('Hello World')).toBe('hello world');
  });

  it('strips accents', () => {
    expect(normalize('café')).toBe('cafe');
    expect(normalize('São Paulo')).toBe('sao paulo');
    expect(normalize('Zürich')).toBe('zurich');
  });

  it('handles Portuguese characters', () => {
    expect(normalize('ação')).toBe('acao');
    expect(normalize('coração')).toBe('coracao');
    expect(normalize('você')).toBe('voce');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('preserves emojis', () => {
    expect(normalize('Bom dia☀️')).toBe('bom dia☀️');
  });
});

describe('searchAsync()', () => {
  beforeEach(() => {
    resetSearchIndex();
  });

  it('returns empty arrays without loading an index for short queries', async () => {
    expect(await searchAsync('a')).toEqual([]);
    expect(await searchAsync('')).toEqual([]);
    expect(await searchAsync('  ')).toEqual([]);
  });
});
