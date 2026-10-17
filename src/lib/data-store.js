/**
 * DataStore — lazy-loading data layer with LRU cache for day-chunks.
 *
 * Usage:
 *   const store = new DataStore({ cacheSize: 30 });
 *   await store.init();
 *   const conversations = store.getConversations();
 *   const index = await store.getConversationIndex('martha-graeff');
 *   const messages = await store.getMessages('martha-graeff', '2024-02-10');
 */

/**
 * Simple LRU cache backed by a Map (insertion-order iteration).
 */
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this._map = new Map();
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key);
    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this.maxSize) {
      // Evict least recently used (first key)
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }
    this._map.set(key, value);
  }

  has(key) {
    return this._map.has(key);
  }

  get size() {
    return this._map.size;
  }

  clear() {
    this._map.clear();
  }
}

export class DataStore {
  /**
   * @param {object} options
   * @param {number} [options.cacheSize=30] - Max day-chunks to keep in LRU cache
   * @param {string} [options.basePath='/data'] - Base path for data files
   * @param {function} [options.fetcher] - Custom fetch function (for testing)
   */
  constructor({ cacheSize = 30, basePath = '/data', fetcher } = {}) {
    this._basePath = basePath;
    this._fetcher = fetcher || ((url) => fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
      return r.json();
    }));
    this._conversations = null;
    this._indexes = new Map();
    this._cache = new LRUCache(cacheSize);
    this._pending = new Map(); // dedup in-flight requests
  }

  /** Load conversations list. Must be called before other methods. */
  async init() {
    if (this._conversations) return;
    const data = await this._fetcher(`${this._basePath}/conversations.json`);
    this._conversations = data.conversations || [];
  }

  /** @returns {Array} list of conversation objects */
  getConversations() {
    return this._conversations || [];
  }

  /**
   * Get a conversation by id.
   * @param {string} id
   * @returns {object|undefined}
   */
  getConversation(id) {
    return this.getConversations().find(c => c.id === id);
  }

  /**
   * Load the date index for a conversation.
   * @param {string} conversationId
   * @returns {Promise<Array>} Array of { date, message_count, first_message_id, last_message_id }
   */
  async getConversationIndex(conversationId) {
    if (this._indexes.has(conversationId)) {
      return this._indexes.get(conversationId);
    }
    const data = await this._fetcher(
      `${this._basePath}/${conversationId}/index.json`
    );
    const dates = data.dates || [];
    this._indexes.set(conversationId, dates);
    return dates;
  }

  /**
   * Find which date contains a given message ID using the date index.
   * @param {string} conversationId
   * @param {number|string} messageId
   * @returns {Promise<string|null>} ISO date string or null if not found
   */
  async findDateForMessage(conversationId, messageId) {
    const dates = await this.getConversationIndex(conversationId);
    const id = Number(messageId);
    for (const entry of dates) {
      if (id >= entry.first_message_id && id <= entry.last_message_id) {
        return entry.date;
      }
    }
    return null;
  }

  /**
   * Load messages for a specific date, with LRU caching and request dedup.
   * @param {string} conversationId
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of message objects
   */
  async getMessages(conversationId, date) {
    const cacheKey = `${conversationId}/${date}`;

    // Return from cache if available
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    // Dedup concurrent requests for the same chunk
    if (this._pending.has(cacheKey)) {
      return this._pending.get(cacheKey);
    }

    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const month = isIsoDate ? date.slice(0, 7) : null;
    const chunkPath = month ? `${month}.json` : `${date}.json`;
    const chunkKey = month ? `${conversationId}/${month}` : cacheKey;

    let promise;
    if (month && this._pending.has(chunkKey)) {
      promise = this._pending.get(chunkKey).then(() => this._cache.get(cacheKey) || []);
    } else {
      const fetchPromise = this._fetcher(
        `${this._basePath}/${conversationId}/${chunkPath}`
      ).then(data => {
        const allMsgs = data.messages || [];
        if (month) {
          const byDay = new Map();
          for (const msg of allMsgs) {
            const d = msg.date;
            if (!byDay.has(d)) byDay.set(d, []);
            byDay.get(d).push(msg);
          }
          for (const [d, msgs] of byDay) {
            this._cache.set(`${conversationId}/${d}`, msgs);
          }
          if (!this._cache.has(cacheKey)) {
            this._cache.set(cacheKey, byDay.get(date) || []);
          }
          this._pending.delete(chunkKey);
          return this._cache.get(cacheKey);
        } else {
          this._cache.set(cacheKey, allMsgs);
          this._pending.delete(chunkKey);
          return allMsgs;
        }
      }).catch(err => {
        if (month) {
          return this._fetcher(
            `${this._basePath}/${conversationId}/${date}.json`
          ).then(data => {
            const messages = data.messages || [];
            this._cache.set(cacheKey, messages);
            this._pending.delete(chunkKey);
            return messages;
          }).catch(innerErr => {
            this._pending.delete(chunkKey);
            throw innerErr;
          });
        }
        this._pending.delete(chunkKey);
        throw err;
      });

      if (month) {
        this._pending.set(chunkKey, fetchPromise);
      }
      promise = fetchPromise.finally(() => {
        this._pending.delete(cacheKey);
      });
    }

    this._pending.set(cacheKey, promise);
    return promise;
  }

  async getMessagesForDates(conversationId, dates) {
    const results = await Promise.all(
      dates.map(date => this.getMessages(conversationId, date))
    );
    return results.flat();
  }

  /** Number of day-chunks currently in cache. */
  get cacheSize() {
    return this._cache.size;
  }

  /** Clear the day-chunk cache. */
  clearCache() {
    this._cache.clear();
    this._pending.clear();
  }
}

// Singleton instance for app-wide use
let _instance = null;

/** Get or create the shared DataStore instance. */
export function getDataStore(options) {
  if (!_instance) {
    _instance = new DataStore(options);
  }
  return _instance;
}

/** Reset singleton (for testing). */
export function resetDataStore() {
  _instance = null;
}

// Export LRUCache for unit testing
export { LRUCache };
