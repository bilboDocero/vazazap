/**
 * Search module — loads the search index and provides fast text search.
 *
 * The search index is a pre-built array of { id, date, sender, content }
 * with content truncated to 80 chars. We do case-insensitive substring matching
 * and normalize accents for broader matching.
 */

let _index = null;
let _indexId = null;
let _loading = null;
let _loadingId = null;
const _normalizedCache = new WeakMap();

let _worker = null;
let _workerReqId = 0;
const _workerCallbacks = new Map();

function getWorker() {
  if (typeof Worker === 'undefined') return null;
  if (!_worker) {
    try {
      _worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
      _worker.onmessage = (e) => {
        const { id, results, error } = e.data;
        const cb = _workerCallbacks.get(id);
        if (cb) {
          _workerCallbacks.delete(id);
          if (error) cb.reject(new Error(error));
          else cb.resolve(results);
        }
      };
    } catch {
      _worker = null;
    }
  }
  return _worker;
}

export function unpackSearchIndex(data) {
  if (Array.isArray(data)) return data;
  if (data && data.messages && data.dates && data.senders) {
    const { dates, senders, messages } = data;
    return messages.map(([id, dIdx, sIdx, content]) => ({
      id,
      date: dates[dIdx],
      sender: senders[sIdx],
      content,
    }));
  }
  return [];
}

function getNormalized(entry) {
  let val = _normalizedCache.get(entry);
  if (val === undefined) {
    val = normalize(entry.content || '');
    _normalizedCache.set(entry, val);
  }
  return val;
}

function warmNormalizedCache(entries) {
  if (!entries || !entries.length) return;
  let i = 0;
  const chunk = 5000;
  function step() {
    const end = Math.min(i + chunk, entries.length);
    for (; i < end; i++) {
      getNormalized(entries[i]);
    }
    if (i < entries.length) {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(step, { timeout: 100 });
      } else {
        setTimeout(step, 0);
      }
    }
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(step, { timeout: 100 });
  } else {
    setTimeout(step, 0);
  }
}

/**
 * Load the search index for a conversation.
 *
 * The loaded index is cached, but keyed by conversation — switching chats has
 * to refetch, or a search in one conversation would return hits from another.
 *
 * @param {string} conversationId
 * @param {string} [basePath='/data']
 * @returns {Promise<Array>}
 */
export async function loadSearchIndex(conversationId, basePath = '/data') {
  if (_index && _indexId === conversationId) return _index;
  if (_loading && _loadingId === conversationId) return _loading;

  _loadingId = conversationId;
  _loading = fetch(`${basePath}/${conversationId}/search-index.json`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // A newer load may have started while this one was in flight; only the
      // most recent conversation's result may claim the cache.
      if (_loadingId === conversationId) {
        _index = unpackSearchIndex(data);
        _indexId = conversationId;
        _loading = null;
        warmNormalizedCache(_index);
        const worker = getWorker();
        if (worker) {
          worker.postMessage({ type: 'load', id: 0, conversationId, basePath });
        }
      }
      return _index;
    })
    .catch(err => {
      if (_loadingId === conversationId) _loading = null;
      throw err;
    });

  return _loading;
}

/**
 * Normalize a string for search: lowercase + strip accents.
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** How much context to keep on each side of a match in a long message. */
const EXCERPT_LEAD = 32;
const EXCERPT_LENGTH = 110;

/**
 * Trim long content down to a window around the match.
 *
 * Result rows are a single ellipsized line, so a match 300 characters into a
 * message would be scrolled off the right edge and invisible. Recentre the text
 * on the match and shift the offsets to suit. Short content is returned as-is.
 *
 * @returns {{content: string, matchStart: number, matchEnd: number}}
 */
function excerptAround(content, matchStart, matchEnd) {
  if (content.length <= EXCERPT_LENGTH) {
    return { content, matchStart, matchEnd };
  }

  let start = Math.max(0, matchStart - EXCERPT_LEAD);
  let end = Math.min(content.length, start + EXCERPT_LENGTH);
  // Near the end of the message, slide the window back so it stays full width.
  start = Math.max(0, Math.min(start, end - EXCERPT_LENGTH));

  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  const offset = prefix.length - start;

  return {
    content: prefix + content.slice(start, end) + suffix,
    matchStart: matchStart + offset,
    matchEnd: matchEnd + offset,
  };
}

/**
 * Search the index for a query string.
 * @param {string} query - search query
 * @param {object} [options]
 * @param {number} [options.limit=50] - max results to return
 * @param {string} [options.sender] - filter by sender name
 * @returns {Array<{ id, date, sender, content, matchStart, matchEnd }>}
 */
export function search(query, { limit = 50, sender } = {}) {
  if (!_index || !query || query.length < 2) return [];

  const normalizedQuery = normalize(query);
  const results = [];

  for (const entry of _index) {
    if (sender && entry.sender !== sender) continue;

    const normalizedContent = getNormalized(entry);
    const matchStart = normalizedContent.indexOf(normalizedQuery);

    if (matchStart !== -1) {
      results.push({
        ...entry,
        ...excerptAround(entry.content, matchStart, matchStart + query.length),
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Search asynchronously using a Web Worker when available.
 */
export async function searchAsync(query, options = {}) {
  const worker = getWorker();
  if (worker && isIndexLoaded()) {
    const id = ++_workerReqId;
    return new Promise((resolve, reject) => {
      _workerCallbacks.set(id, { resolve, reject });
      worker.postMessage({ type: 'search', id, query, options });
    });
  }
  return search(query, options);
}

/** Clear the loaded index (for testing). */
export function resetSearchIndex() {
  _index = null;
  _indexId = null;
  _loading = null;
  _loadingId = null;
  if (_worker) {
    _worker.terminate();
    _worker = null;
    _workerCallbacks.clear();
  }
}

/**
 * Check if an index is loaded — for a specific conversation when given one.
 * @param {string} [conversationId]
 */
export function isIndexLoaded(conversationId) {
  if (_index === null) return false;
  return conversationId === undefined || _indexId === conversationId;
}
