// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SearchEngine } from '../../src/lib/search-engine.js';
import { messageDateKey } from '../../src/lib/message-date.js';

const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const manifest = read('public/data/search-manifest.json');
const bytes = readFileSync(new URL('../../public/data/' + manifest.file, import.meta.url));
const data = JSON.parse(bytes);

describe('generated full-text corpus', () => {
  it('versions the immutable file using the content hash', () => {
    expect(manifest.file).toBe('search-index.' + createHash('sha256').update(bytes).digest('hex').slice(0, 16) + '.json');
    expect(manifest.message_count).toBe(data.messages.length);
  });

  it('preserves every searchable message in data/conversations and the Martha source', () => {
    const records = new Map(data.messages.map(([conversation, id, date, sender, content]) => [data.conversations[conversation].id + ':' + id, { content, date: data.dates[date], sender: data.senders[sender] }]));
    const directory = new URL('../../data/conversations/', import.meta.url);
    const sources = readdirSync(directory).filter(name => name.endsWith('.json')).map(name => [name.slice(0, -5), JSON.parse(readFileSync(new URL(name, directory), 'utf8'))]);
    sources.push(['martha-graeff', read('data/messages.json')]);
    let count = 0;
    for (const [conversationId, source] of sources) {
      for (const message of source.messages) {
        const content = (message.content || '').trim();
        if (message.type === 'system' || !content) continue;
        expect(records.get(conversationId + ':' + message.id), conversationId + ':' + message.id).toEqual({ content, date: messageDateKey(message), sender: message.sender });
        count++;
      }
    }
    expect(count).toBe(data.messages.length);
  }, 20000);

  it('finds a phrase past the old Martha cutoff in the actual generated index', async () => {
    const message = read('data/messages.json').messages.find(message => message.type === 'text' && message.content.length > 200);
    const query = message.content.trim().slice(-30);
    const engine = await new SearchEngine(data).prepare();
    let cursor = 0, found = false;
    do {
      const page = await engine.search(query, { conversationId: 'martha-graeff', cursor });
      found ||= page.results.some(hit => hit.id === message.id);
      cursor = page.nextCursor;
    } while (!found && cursor !== null);
    expect(found).toBe(true);
  });
});
