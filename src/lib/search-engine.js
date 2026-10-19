/** Compact full-text search, shared by the worker and cooperative fallback. */
export const yieldSearch = () => new Promise(resolve => setTimeout(resolve, 0));

export function normalize(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Per-conversation files remain available to the corpus/build validation tools.
export function unpackSearchIndex(data) {
  if (Array.isArray(data)) return data;
  if (!data?.messages || !data.dates || !data.senders) return [];
  return data.messages.map(([id, date, sender, content, contentFormat]) => ({ id, date: data.dates[date], sender: data.senders[sender], content, ...(contentFormat ? { content_format: contentFormat } : {}) }));
}

function excerpt(content, normalized, start, length) {
  let end = start + length;
  // Decomposed accents occupy extra positions in the original text.
  if (content.length !== normalized.length) {
    let offset = 0, normalizedOffset = 0, originalStart = null;
    for (const character of content) {
      const size = normalize(character).length;
      if (originalStart === null && size && normalizedOffset + size > start) originalStart = offset;
      normalizedOffset += size;
      offset += character.length;
      if (normalizedOffset >= end) {
        end = offset + (content.slice(offset).match(/^\p{M}*/u)?.[0].length || 0);
        break;
      }
    }
    start = originalStart ?? start;
  }
  const windowStart = Math.max(0, start - 32);
  const windowEnd = Math.min(content.length, Math.max(windowStart + 110, end));
  const prefix = windowStart ? '…' : '';
  return {
    content: prefix + content.slice(windowStart, windowEnd) + (windowEnd < content.length ? '…' : ''),
    matchStart: start - windowStart + prefix.length,
    matchEnd: end - windowStart + prefix.length,
  };
}

export class SearchEngine {
  constructor(data) {
    if (data?.version !== 1 || !Array.isArray(data.messages) || !Array.isArray(data.conversations) || !Array.isArray(data.dates) || !Array.isArray(data.senders)) {
      throw new Error('Invalid search index');
    }
    this.data = data;
    this.normalized = new Array(data.messages.length);
    this.conversationIds = new Map(data.conversations.map((conversation, index) => [conversation.id, index]));
  }

  async prepare() {
    for (let i = 0; i < this.data.messages.length; i++) {
      this.normalized[i] = normalize(this.data.messages[i][4]);
      if ((i + 1) % 4096 === 0) await yieldSearch();
    }
    return this;
  }

  async search(query, { limit = 50, cursor = 0, conversationId, sender } = {}, cancelled = () => false) {
    const needle = normalize(query.trim());
    const results = [];
    if (needle.length < 2) return { results, nextCursor: null };
    const scope = conversationId ? this.conversationIds.get(conversationId) : null;
    if (conversationId && scope === undefined) return { results, nextCursor: null };
    limit = Math.min(100, Math.max(1, Math.floor(limit) || 50));
    const { messages, conversations, dates, senders } = this.data;
    for (let i = Math.max(0, Math.floor(cursor) || 0); i < messages.length; i++) {
      if (cancelled()) throw new DOMException('Search cancelled', 'AbortError');
      if (i && i % 4096 === 0) {
        await yieldSearch();
        if (cancelled()) throw new DOMException('Search cancelled', 'AbortError');
      }
      const [conversationIndex, id, dateIndex, senderIndex, content, contentFormat] = messages[i];
      if (scope !== null && conversationIndex !== scope) continue;
      if (sender && senders[senderIndex] !== sender) continue;
      const matchStart = this.normalized[i].indexOf(needle);
      if (matchStart < 0) continue;
      // Look ahead once so the UI only offers another page when one exists.
      if (results.length === limit) return { results, nextCursor: i };
      const conversation = conversations[conversationIndex];
      results.push({
        id, conversationId: conversation.id, contactName: conversation.contact,
        date: dates[dateIndex], sender: senders[senderIndex], ...(conversation.excerpt ? { excerpt: true } : {}),
        ...(contentFormat ? { content_format: contentFormat } : {}),
        ...excerpt(content, this.normalized[i], matchStart, needle.length),
      });
    }
    return { results, nextCursor: null };
  }
}
