// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchAsync, searchPage, resetSearchIndex } from '../../src/lib/search.js';

const filename = 'search-index.0123456789abcdef.json';
function fixture(messages) {
  return {
    version: 1,
    conversations: [{ id: 'martha-graeff', contact: 'Martha Graeff' }, { id: 'alexandre-de-moraes', contact: 'Alexandre de Moraes' }],
    dates: ['2025-11-15', '2024-02-10'], senders: ['DV', 'MG'],
    messages: messages || [[1, 1, 0, 0, 'Acha que segunda ja tenho que estar fora?'], [0, 1, 1, 0, 'Bom dia peleleca'], [0, 2, 1, 1, 'Bom dia']],
  };
}
function mockIndex(data = fixture()) {
  const fetcher = vi.fn(async url => ({ ok: true, json: async () => String(url).endsWith('search-manifest.json') ? { version: 1, file: filename } : data }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
beforeEach(() => { resetSearchIndex(); mockIndex(); });
afterEach(() => { resetSearchIndex(); vi.unstubAllGlobals(); });

describe('global index loading and scoped searches', () => {
  it('finds messages in different conversations even when message IDs collide', async () => {
    const first = await searchAsync('estar fora');
    const second = await searchAsync('peleleca');
    expect(first[0]).toMatchObject({ id: 1, conversationId: 'alexandre-de-moraes', contactName: 'Alexandre de Moraes' });
    expect(second[0]).toMatchObject({ id: 1, conversationId: 'martha-graeff', contactName: 'Martha Graeff' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('coalesces concurrent loads and reuses the same index for scoped searches', async () => {
    const [global, scoped] = await Promise.all([searchAsync('Bom dia'), searchAsync('Bom dia', { conversationId: 'alexandre-de-moraes' })]);
    expect(global).toHaveLength(2);
    expect(scoped).toEqual([]);
    expect(await searchAsync('peleleca', { conversationId: 'martha-graeff' })).toHaveLength(1);
    expect(await searchAsync('Bom dia', { conversationId: 'unknown' })).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('revalidates the manifest and uses the immutable index cache', async () => {
    await searchAsync('Bom dia');
    expect(fetch).toHaveBeenNthCalledWith(1, '/data/search-manifest.json', { cache: 'no-cache' });
    expect(fetch).toHaveBeenNthCalledWith(2, '/data/' + filename, { cache: 'force-cache' });
  });
  it('propagates failures and permits retrying the same query', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(searchAsync('Bom dia')).rejects.toThrow('503');
    expect(await searchAsync('Bom dia')).toHaveLength(2);
  });
  it('rejects invalid manifest paths', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1, file: '../secrets.json' }) });
    await expect(searchAsync('Bom dia')).rejects.toThrow('Invalid search manifest');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports data-file failures rather than empty search results', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1, file: filename }) });
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(searchAsync('Bom dia')).rejects.toThrow('404');
  });
  it('does not load data for a request already cancelled', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(searchPage('Bom dia', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('cancelling one query does not cancel a shared load needed by another', async () => {
    let release;
    fetch.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const controller = new AbortController();
    const cancelled = searchPage('Bom dia', { signal: controller.signal });
    const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    const active = searchAsync('peleleca');
    controller.abort();
    release({ ok: true, json: async () => ({ version: 1, file: filename }) });
    await rejected;
    expect(await active).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('falls back when worker startup fails', async () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Blocked worker'); } });
    expect(await searchAsync('peleleca')).toHaveLength(1);
  });
  it('coalesces fallback initialization after an asynchronous worker failure', async () => {
    vi.stubGlobal('Worker', class {
      postMessage() { setTimeout(() => this.onerror({ preventDefault() {} }), 0); }
      terminate() {}
    });
    const hits = await Promise.all([searchAsync('peleleca'), searchAsync('Bom dia')]);
    expect(hits.map(results => results.length)).toEqual([1, 2]);
    expect(await searchAsync('peleleca')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('recovers if a ready worker fails during a later search', async () => {
    vi.stubGlobal('Worker', class {
      postMessage(message) {
        if (message.type === 'load') queueMicrotask(() => this.onmessage({ data: { id: message.id, result: { count: 3 } } }));
        else setTimeout(() => this.onerror({ preventDefault() {} }), 0);
      }
      terminate() {}
    });
    expect(await searchAsync('peleleca')).toHaveLength(1);
    expect(await searchAsync('peleleca')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('complete text and pagination', () => {
  it('searches beyond the old 80-character cutoff and returns a small highlighted excerpt', async () => {
    mockIndex(fixture([[0, 1, 1, 0, 'Earlier content. '.repeat(40) + 'the final needle'] ]));
    const [hit] = await searchAsync('final needle');
    expect(hit.content.length).toBeLessThan(150);
    expect(hit.content.startsWith('\u2026')).toBe(true);
    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('final needle');
  });
  it('keeps accent-insensitive highlights aligned with decomposed original text', async () => {
    mockIndex(fixture([[0, 1, 1, 0, 'Um cafe\u0301 para voce\u0302'] ]));
    const [hit] = await searchAsync('voce');
    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('voce\u0302');
  });
  it('returns every match across pages without duplicates or an empty extra page', async () => {
    mockIndex(fixture(Array.from({ length: 123 }, (_, i) => [i % 2, i, 0, 0, 'Bom dia ' + i])));
    const pages = [];
    let cursor = 0;
    do {
      const page = await searchPage('Bom dia', { cursor });
      expect(page.results.length).toBeLessThanOrEqual(50);
      pages.push(...page.results);
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(pages).toHaveLength(123);
    expect(new Set(pages.map(hit => hit.conversationId + ':' + hit.id)).size).toBe(123);
  });
  it('filters by sender without losing pagination scope', async () => {
    expect(await searchAsync('Bom dia', { conversationId: 'martha-graeff', sender: 'MG' })).toMatchObject([{ id: 2, sender: 'MG' }]);
  });
  it('can cancel a long fallback scan between batches', async () => {
    mockIndex(fixture(Array.from({ length: 18000 }, (_, i) => [0, i, 0, 0, 'Bom dia'])));
    await searchAsync('Bom dia');
    const controller = new AbortController();
    const pending = searchPage('not-found-anywhere', { signal: controller.signal });
    setTimeout(() => controller.abort(), 0);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
