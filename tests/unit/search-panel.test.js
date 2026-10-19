import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/lib/search.js', () => ({ searchPage: vi.fn() }));
import { searchPage } from '../../src/lib/search.js';
import { attachSearch } from '../../src/components/SearchPanel.js';
let panel, input, onResult;
const hit = (id = 1, contactName = 'Martha Graeff') => ({ id, conversationId: 'martha-graeff', contactName, date: '2025-01-01', sender: 'DV', content: 'Bom dia <script>bad</script>', matchStart: 0, matchEnd: 7 });
async function type(query) { input.value = query; input.dispatchEvent(new Event('input')); await vi.advanceTimersByTimeAsync(200); }
beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<aside><input class="sidebar-search-input"><div class="conversation-list"></div></aside>';
  onResult = vi.fn();
  searchPage.mockReset().mockResolvedValue({ results: [hit()], nextCursor: null });
  panel = attachSearch(document.querySelector('aside'), onResult);
  input = document.querySelector('input');
});
afterEach(() => { panel.destroy(); vi.useRealTimers(); });

describe('global sidebar search', () => {
  it('opens suggestions without loading the index and searches a selected term only once', async () => {
    input.focus();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('.search-suggestions').hidden).toBe(false);
    expect(document.querySelectorAll('.search-suggestion')).toHaveLength(8);
    expect(searchPage).not.toHaveBeenCalled();
    document.querySelector('.search-suggestion').click();
    expect(input.value).toBe('peleleca');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await vi.advanceTimersByTimeAsync(200);
    expect(searchPage).toHaveBeenCalledTimes(1);
    expect(searchPage.mock.calls[0][0]).toBe('peleleca');
  });
  it('supports keyboard selection and closes the suggestions on Escape or outside pointer input', async () => {
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    const selected = document.getElementById(input.getAttribute('aria-activedescendant'));
    expect(selected.textContent).toBe('sem nota');
    expect(selected.getAttribute('aria-selected')).toBe('true');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(searchPage.mock.calls[0][0]).toBe('sem nota');
    await type('');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.click();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(input);
  });
  it('shows the conversation name and full author name, escapes snippets and preserves result identity', async () => {
    await type('Bom dia');
    expect(document.querySelector('.search-result-contact').textContent).toBe('Martha Graeff');
    expect(document.querySelector('.search-result-sender').textContent).toBe('Daniel Vorcaro: ');
    expect(document.querySelector('.search-highlight').textContent).toBe('Bom dia');
    expect(document.querySelector('.search-result-content script')).toBeNull();
    document.querySelector('.search-result-item').click();
    expect(onResult).toHaveBeenCalledWith(hit());
  });
  it('appends another page only when requested and does not duplicate earlier rows', async () => {
    searchPage.mockResolvedValueOnce({ results: [hit(1)], nextCursor: 100 }).mockResolvedValueOnce({ results: [hit(2)], nextCursor: null });
    await type('Bom dia');
    expect(document.querySelectorAll('.search-result-item')).toHaveLength(1);
    document.querySelector('.search-load-more').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(searchPage.mock.calls[1][1]).toMatchObject({ cursor: 100, limit: 50 });
    expect(document.querySelectorAll('.search-result-item')).toHaveLength(2);
    expect(document.querySelector('.search-load-more').hidden).toBe(true);
  });
  it('ignores a late response for an earlier query even if the provider ignores cancellation', async () => {
    let release;
    searchPage.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await type('old');
    await type('new');
    release({ results: [hit(9, 'Wrong old contact')], nextCursor: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(searchPage.mock.calls[0][1].signal.aborted).toBe(true);
    expect(document.querySelector('.search-result-contact').textContent).toBe('Martha Graeff');
  });
  it('does not resurrect results after Escape while the index is loading', async () => {
    let release;
    searchPage.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await type('Bom dia');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    release({ results: [hit()], nextCursor: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(input.value).toBe('');
    expect(document.querySelector('.search-results')).toBeNull();
    expect(document.querySelector('.conversation-list').style.display).toBe('');
  });
  it('offers a retry after loading fails instead of reporting no matches', async () => {
    searchPage.mockRejectedValueOnce(new Error('Network failure'));
    await type('Bom dia');
    expect(document.querySelector('.search-feedback').textContent).toContain('pesquisar');
    expect(document.querySelector('.search-empty')).toBeNull();
    document.querySelector('.search-load-more').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelectorAll('.search-result-item')).toHaveLength(1);
  });
  it('leaves the index unloaded until a meaningful query is entered', async () => {
    expect(searchPage).not.toHaveBeenCalled();
    await type('a');
    expect(searchPage).not.toHaveBeenCalled();
  });
});
