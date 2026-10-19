/** Lazy chat history with navigation that waits for initialization and keeps the latest selection. */
import { highlightMessageText, clearMessageTextHighlight } from './message-search-highlight.js';
const INITIAL_DAYS = 5;
const LOAD_MORE_DAYS = 5;

export class ScrollLoader {
  constructor({ container, dateIndex, loadMessages, renderDay }) {
    this._container = container;
    this._dateIndex = dateIndex;
    this._loadMessages = loadMessages;
    this._renderDay = renderDay;
    this._loadedDates = new Set();
    this._pendingDates = new Map();
    this._loading = false;
    this._nextIndex = dateIndex.length - 1;
    this._observer = null;
    this._sentinel = null;
    this._initialization = null;
    this._destroyed = false;
    this._navigationVersion = 0;
    this._navigating = false;
    this._selectedMessage = null;
    this._highlightTimer = null;
  }

  init() {
    if (!this._initialization) this._initialization = this._init();
    return this._initialization;
  }

  async _init() {
    if (this._destroyed) return;
    this._sentinel = document.createElement('div');
    this._sentinel.className = 'scroll-sentinel';
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._container.prepend(this._sentinel);
    await this._loadBatch(INITIAL_DAYS);
    if (this._destroyed) return;
    // A pending message navigation owns the position instead of the initial bottom scroll.
    if (this._navigationVersion === 0) this._scrollToBottom();
    this._observer = new IntersectionObserver(entries => {
      if (!this._destroyed && entries[0].isIntersecting && !this._loading && !this._navigating) this._loadBatch(LOAD_MORE_DAYS);
    }, { root: this._container, rootMargin: '200px 0px 0px 0px' });
    this._observer.observe(this._sentinel);
  }

  async _loadBatch(count) {
    if (this._destroyed || this._loading || this._nextIndex < 0) return;
    this._loading = true;
    let loaded = 0;
    try {
      while (!this._destroyed && loaded < count && this._nextIndex >= 0) {
        const entry = this._dateIndex[this._nextIndex--];
        if (this._loadedDates.has(entry.date)) continue;
        if (await this.loadDate(entry.date)) loaded++;
      }
    } finally {
      this._loading = false;
    }
    if (this._nextIndex < 0 && this._sentinel) this._observer?.unobserve(this._sentinel);
  }

  _scrollToBottom() { this._container.scrollTop = this._container.scrollHeight; }
  async scrollToBottom() {
    const version = ++this._navigationVersion;
    this._navigating = false;
    this._clearHighlight();
    await this._initialization;
    if (this._destroyed || version !== this._navigationVersion) return;
    this._scrollToBottom();
  }
  get isFullyLoaded() { return this._nextIndex < 0; }
  get loadedCount() { return this._loadedDates.size; }

  /** Deduplicate dates requested by lazy loading and message navigation. */
  async loadDate(date) {
    if (this._destroyed) return null;
    if (this._loadedDates.has(date)) return this._container.querySelector(`[data-date="${date}"]`);
    if (this._pendingDates.has(date)) return this._pendingDates.get(date);
    const task = (async () => {
      try {
        const messages = await this._loadMessages(date);
        if (this._destroyed) return null;
        const day = this._renderDay(date, messages);
        // Preserve the visible day at insertion time, including scrollTop=0.
        // A whole-batch height delta also counts days inserted below the view
        // and can override a search jump or a scroll made while fetching.
        const viewportTop = this._container.getBoundingClientRect().top;
        const anchor = [...this._container.querySelectorAll('.chat-day')]
          .find(section => section.getBoundingClientRect().bottom > viewportTop);
        const anchorTop = anchor?.getBoundingClientRect().top;
        const nextDay = [...this._container.querySelectorAll('.chat-day')].find(section => section.dataset.date > date);
        if (nextDay) this._container.insertBefore(day, nextDay);
        else this._container.appendChild(day);
        if (anchor) this._container.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
        this._loadedDates.add(date);
        return day;
      } catch (error) {
        if (!this._destroyed) console.error(`Failed to load day ${date}:`, error);
        return null;
      }
    })().finally(() => this._pendingDates.delete(date));
    this._pendingDates.set(date, task);
    return task;
  }

  _clearHighlight() {
    clearTimeout(this._highlightTimer);
    this._selectedMessage?.classList.remove('msg-highlight', 'msg-search-selected');
    if (this._selectedMessage) clearMessageTextHighlight(this._selectedMessage);
    this._selectedMessage = null;
  }

  _highlight(message, query = '') {
    this._clearHighlight();
    this._selectedMessage = message;
    message.classList.add('msg-search-selected');
    void message.offsetHeight;
    message.classList.add('msg-highlight');
    // Keep the selection visible after the introductory flash finishes.
    this._highlightTimer = setTimeout(() => message.classList.remove('msg-highlight'), 1500);
    return highlightMessageText(message, query) || message;
  }

  /** Wait for the initial batch; a slower earlier click cannot override a later one. */
  async scrollToMessage(messageId, date, highlight = true, query = '') {
    const version = ++this._navigationVersion;
    this._navigating = true;
    try {
      await this._initialization;
      if (this._destroyed || version !== this._navigationVersion) return false;
      const day = await this.loadDate(date);
      if (this._destroyed || version !== this._navigationVersion || !day) return false;
      const message = [...day.querySelectorAll('[data-id]')].find(element => element.dataset.id === String(messageId));
      if (!message) return false;
      const target = highlight ? this._highlight(message, query) : message;
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    } finally {
      if (version === this._navigationVersion) this._navigating = false;
    }
  }

  async scrollToDate(date) {
    const version = ++this._navigationVersion;
    this._navigating = true;
    try {
      await this._initialization;
      if (this._destroyed || version !== this._navigationVersion) return;
      const day = await this.loadDate(date);
      if (this._destroyed || version !== this._navigationVersion || !day) return;
      const firstMessage = day.querySelector('.chat-msg-row');
      if (firstMessage) this._highlight(firstMessage);
      (firstMessage || day).scrollIntoView({ block: 'center', behavior: 'instant' });
    } finally {
      if (version === this._navigationVersion) this._navigating = false;
    }
  }

  destroy() {
    this._destroyed = true;
    this._navigationVersion++;
    this._observer?.disconnect();
    this._observer = null;
    this._clearHighlight();
  }
}
