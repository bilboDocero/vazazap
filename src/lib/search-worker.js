/**
 * Search Web Worker ? executes index unpacking, normalization, and search
 * off the main thread to ensure 60 FPS UI on mobile devices.
 */

let _index = null;
let _indexId = null;
const _normalizedCache = new WeakMap();

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getNormalized(entry) {
  let val = _normalizedCache.get(entry);
  if (val === undefined) {
    val = normalize(entry.content || '');
    _normalizedCache.set(entry, val);
  }
  return val;
}

function unpackIndex(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && raw.messages && raw.dates && raw.senders) {
    const { dates, senders, messages } = raw;
    return messages.map(([id, dIdx, sIdx, content]) => ({
      id,
      date: dates[dIdx],
      sender: senders[sIdx],
      content,
    }));
  }
  return [];
}

const EXCERPT_LEAD = 32;
const EXCERPT_LENGTH = 110;

function excerptAround(content, matchStart, matchEnd) {
  if (content.length <= EXCERPT_LENGTH) {
    return { content, matchStart, matchEnd };
  }

  let start = Math.max(0, matchStart - EXCERPT_LEAD);
  let end = Math.min(content.length, start + EXCERPT_LENGTH);
  start = Math.max(0, Math.min(start, end - EXCERPT_LENGTH));

  const prefix = start > 0 ? '?' : '';
  const suffix = end < content.length ? '?' : '';
  const offset = prefix.length - start;

  return {
    content: prefix + content.slice(start, end) + suffix,
    matchStart: matchStart + offset,
    matchEnd: matchEnd + offset,
  };
}

self.onmessage = async (e) => {
  const { type, id, conversationId, basePath, query, options } = e.data;

  if (type === 'load') {
    try {
      const res = await fetch(`${basePath}/${conversationId}/search-index.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      _index = unpackIndex(raw);
      _indexId = conversationId;
      self.postMessage({ type: 'load_done', id, count: _index.length });
    } catch (err) {
      self.postMessage({ type: 'error', id, error: err.message });
    }
  } else if (type === 'search') {
    if (!_index || !query || query.length < 2) {
      self.postMessage({ type: 'search_done', id, results: [] });
      return;
    }
    const { limit = 50, sender } = options || {};
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
    self.postMessage({ type: 'search_done', id, results });
  }
};
