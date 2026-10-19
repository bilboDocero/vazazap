import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollLoader } from '../../src/lib/scroll-loader.js';

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = [];
  }
  observe(el) { this.elements.push(el); }
  unobserve(el) { this.elements = this.elements.filter(e => e !== el); }
  disconnect() { this.elements = []; }
  // Helper to simulate intersection
  trigger(isIntersecting) {
    this.callback([{ isIntersecting }]);
  }
}

function createMockContainer() {
  const el = document.createElement('div');
  // Simulate scrollable container
  Object.defineProperty(el, 'scrollHeight', {
    get: () => el.children.length * 100,
    configurable: true,
  });
  Object.defineProperty(el, 'scrollTop', {
    value: 0,
    writable: true,
    configurable: true,
  });
  return el;
}

describe('ScrollLoader', () => {
  let container;
  let dateIndex;
  let loadMessages;
  let renderDay;

  beforeEach(() => {
    // Install mock IntersectionObserver
    globalThis.IntersectionObserver = MockIntersectionObserver;

    container = createMockContainer();
    document.body.appendChild(container);

    dateIndex = [
      { date: '2024-02-10', message_count: 5 },
      { date: '2024-02-11', message_count: 3 },
      { date: '2024-02-12', message_count: 7 },
      { date: '2024-02-13', message_count: 2 },
      { date: '2024-02-14', message_count: 4 },
    ];

    loadMessages = vi.fn((date) =>
      Promise.resolve([{ id: 1, date, content: `msg from ${date}` }])
    );

    renderDay = vi.fn((date, messages) => {
      const el = document.createElement('section');
      el.dataset.date = date;
      el.textContent = `Day: ${date}`;
      return el;
    });
  });

  it('loads initial batch of days on init', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    // Should load all 5 days (INITIAL_DAYS = 5, and we have exactly 5)
    expect(loader.loadedCount).toBe(5);
    expect(loadMessages).toHaveBeenCalledTimes(5);
  });

  it('loads most recent days first', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    // First call should be for the most recent date
    expect(loadMessages).toHaveBeenNthCalledWith(1, '2024-02-14');
    expect(loadMessages).toHaveBeenNthCalledWith(2, '2024-02-13');
  });

  it('creates a sentinel element', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    const sentinel = container.querySelector('.scroll-sentinel');
    expect(sentinel).not.toBeNull();
  });

  it('calls renderDay for each loaded day', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    expect(renderDay).toHaveBeenCalledTimes(5);
  });

  it('reports fully loaded when all days are loaded', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    expect(loader.isFullyLoaded).toBe(true);
  });

  it('handles empty date index gracefully', async () => {
    const loader = new ScrollLoader({
      container,
      dateIndex: [],
      loadMessages,
      renderDay,
    });
    await loader.init();

    expect(loader.loadedCount).toBe(0);
    expect(loader.isFullyLoaded).toBe(true);
  });

  it('handles loadMessages errors gracefully', async () => {
    const failingLoader = vi.fn(() => Promise.reject(new Error('network error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const loader = new ScrollLoader({
      container,
      dateIndex: [{ date: '2024-01-01', message_count: 1 }],
      loadMessages: failingLoader,
      renderDay,
    });
    await loader.init();

    expect(consoleSpy).toHaveBeenCalled();
    expect(loader.loadedCount).toBe(0);
    consoleSpy.mockRestore();
  });

  it('cleans up observer on destroy', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();
    loader.destroy();

    // Should not throw
    expect(() => loader.destroy()).not.toThrow();
  });
});

// Regression cases for searches selected while history is still loading.
describe('ScrollLoader message navigation', () => {
  let loader, container, loadMessages, originalScroll;
  const day = number => `2024-02-${String(number).padStart(2, '0')}`;
  const messages = date => [{ id: Number(date.slice(-2)), date, content: 'needle ' + date }];
  beforeEach(() => {
    globalThis.IntersectionObserver = MockIntersectionObserver;
    originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn(function () { this.closest('.test-scroll').lastScrollTarget = this; }) });
    container = createMockContainer();
    container.className = 'test-scroll';
    document.body.appendChild(container);
    loadMessages = vi.fn(async date => messages(date));
    loader = new ScrollLoader({
      container,
      dateIndex: Array.from({ length: 7 }, (_, i) => ({ date: day(i + 10) })),
      loadMessages,
      renderDay: (date, rows) => {
        const section = document.createElement('section'); section.className = 'chat-day'; section.dataset.date = date;
        for (const message of rows) {
          const row = document.createElement('div'); row.className = 'chat-msg-row'; row.dataset.id = message.id;
          const content = document.createElement('div'); content.className = 'chat-msg-content-text'; content.textContent = message.content;
          row.appendChild(content); section.appendChild(row);
        }
        return section;
      },
    });
  });
  afterEach(() => {
    loader.destroy(); container.remove(); vi.useRealTimers();
    if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
    else delete HTMLElement.prototype.scrollIntoView;
  });

  it('waits for initialization before jumping and marking the selected occurrence', async () => {
    let release;
    loadMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const initialization = loader.init();
    const navigation = loader.scrollToMessage(10, day(10), true, 'needle');
    expect(container.lastScrollTarget).toBeUndefined();
    release(messages(day(16)));
    await initialization;
    expect(await navigation).toBe(true);
    expect(container.lastScrollTarget.textContent).toBe('needle');
    expect(container.querySelector('.msg-search-selected').dataset.id).toBe('10');
  });

  it('keeps the latest click when the earlier date finishes loading later', async () => {
    await loader.init();
    let release;
    loadMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const oldNavigation = loader.scrollToMessage(10, day(10), true, 'needle');
    await Promise.resolve();
    const newNavigation = loader.scrollToMessage(11, day(11), true, 'needle');
    expect(await newNavigation).toBe(true);
    release(messages(day(10)));
    expect(await oldNavigation).toBe(false);
    expect(container.querySelector('.msg-search-selected').dataset.id).toBe('11');
    expect(container.lastScrollTarget.closest('[data-id]').dataset.id).toBe('11');
  });

  it('deduplicates concurrent requests for a day', async () => {
    await loader.init();
    let release;
    loadMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const count = loadMessages.mock.calls.length;
    const first = loader.loadDate(day(10)), second = loader.loadDate(day(10));
    release(messages(day(10)));
    expect(await first).toBe(await second);
    expect(loadMessages.mock.calls.length - count).toBe(1);
    expect(container.querySelectorAll(`[data-date="${day(10)}"]`)).toHaveLength(1);
  });

  it('does not restore an old scroll position after a newer selection during background loading', async () => {
    await loader.init();
    container.scrollTop = 100;
    let release;
    loadMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const background = loader._loadBatch(2);
    await loader.scrollToMessage(13, day(13), true, 'needle');
    container.scrollTop = 777;
    release(messages(day(11)));
    await background;
    expect(container.scrollTop).toBe(777);
    expect(container.querySelector('.msg-search-selected').dataset.id).toBe('13');
  });

  it('does not insert or mark a pending day after the conversation is destroyed', async () => {
    await loader.init();
    let release;
    loadMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const navigation = loader.scrollToMessage(10, day(10));
    await Promise.resolve();
    loader.destroy();
    release(messages(day(10)));
    expect(await navigation).toBe(false);
    expect(container.querySelector(`[data-date="${day(10)}"]`)).toBeNull();
    expect(container.querySelector('.msg-search-selected')).toBeNull();
  });

  it('preserves a search result at the top when an older day is inserted above it', async () => {
    await loader.init();
    container.scrollTop = 0;
    const anchor = container.querySelector('[data-date="2024-02-14"]');
    anchor.getBoundingClientRect = () => {
      const before = [...container.querySelectorAll('.chat-day')].filter(section => section.dataset.date < day(14)).length;
      return { top: before * 100 - container.scrollTop, bottom: before * 100 - container.scrollTop + 100 };
    };
    const before = anchor.getBoundingClientRect().top;
    await loader.loadDate(day(10));
    expect(container.scrollTop).toBe(100);
    expect(anchor.getBoundingClientRect().top).toBe(before);
  });

  it('does not shift the visible day for content inserted below it', async () => {
    await loader.init();
    container.scrollTop = 0;
    const anchor = container.querySelector('[data-date="2024-02-12"]');
    anchor.getBoundingClientRect = () => ({ top: 0, bottom: 100 });
    await loader.loadDate(day(20));
    expect(container.scrollTop).toBe(0);
  });

  it('retains the selection after the flash and removes the old marking on another selection', async () => {
    await loader.init();
    vi.useFakeTimers();
    await loader.scrollToMessage(12, day(12), true, 'needle');
    await vi.advanceTimersByTimeAsync(1600);
    const first = container.querySelector('[data-id="12"]');
    expect(first.classList.contains('msg-highlight')).toBe(false);
    expect(first.classList.contains('msg-search-selected')).toBe(true);
    expect(first.querySelector('.message-search-match').textContent).toBe('needle');
    await loader.scrollToMessage(13, day(13), true, 'needle');
    expect(first.querySelector('.message-search-match')).toBeNull();
    expect(first.classList.contains('msg-search-selected')).toBe(false);
    expect(container.querySelectorAll('.msg-search-selected')).toHaveLength(1);
  });
});
