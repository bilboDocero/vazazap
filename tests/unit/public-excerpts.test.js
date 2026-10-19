import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DataStore } from '../../src/lib/data-store.js';
import { SearchEngine } from '../../src/lib/search-engine.js';
import { archiveDate, archiveTime, messageDateKey, publicSourceFor, publicMessageLabel } from '../../src/lib/message-date.js';
import { renderDaySection, renderMessage } from '../../src/components/ChatView.js';

const location = path => new URL('../../' + path, import.meta.url);
const read = path => JSON.parse(readFileSync(location(path), 'utf8'));
const entries = read('public/data/conversations.json').conversations.filter(entry => entry.coverage === 'selected_public_excerpts');
const originals = readdirSync(location('data/conversations/'))
  .filter(name => name.endsWith('.json'))
  .map(name => [name.slice(0, -5), read('data/conversations/' + name)])
  .filter(([, data]) => data.metadata.coverage === 'selected_public_excerpts' && data.metadata.publication_ready);
const fetcher = async url => read('public' + url);
let engine, store;
beforeAll(async () => {
  const manifest = read('public/data/search-manifest.json');
  engine = await new SearchEngine(read('public/data/' + manifest.file)).prepare();
  store = new DataStore({ fetcher });
  await store.init();
});

describe('Published public-source excerpts', () => {
  it('keeps exact dates, month/year, year and missing dates distinct', () => {
    expect(archiveDate('2025-05-23')).toBe('23/05/2025');
    expect(archiveDate('2025-05', true)).toBe('maio de 2025');
    expect(archiveDate('2025-05')).toBe('05/2025');
    expect(archiveDate('2025')).toBe('2025');
    expect(archiveDate('undated')).toBe('Data não informada');
    expect(archiveDate(null)).toBe('Data não informada');
    expect(archiveTime(null)).toBe('Horário não informado');
  });

  it('includes every published public-source conversation', () => {
    expect(entries.map(entry => entry.id).sort()).toEqual(originals.map(([id]) => id).sort());
  });
  it.each(entries.map(entry => [entry.id, entry]))('%s resolves every record to its original source, date and time', async (_id, entry) => {
      const original = read('data/conversations/' + entry.id + '.json');
      const index = await store.getConversationIndex(entry.id);
      const loaded = await store.getMessagesForDates(entry.id, index.map(day => day.date));
      expect(loaded.map(message => message.id).sort()).toEqual(original.messages.map(message => message.id).sort());
      for (const message of original.messages) {
        const key = messageDateKey(message);
        const page = await engine.search(message.content, { conversationId: entry.id });
        const result = page.results.find(result => result.id === message.id);
        expect(result, entry.id + ':' + message.id).toMatchObject({ date: key, excerpt: true });
        expect(await store.findDateForMessage(entry.id, message.id)).toBe(key);
        const loadedMessage = (await store.getMessages(entry.id, key)).find(candidate => candidate.id === message.id);
        expect(loadedMessage).toEqual(message);
        const row = renderMessage(loadedMessage, false, entry);
        expect(row.querySelector('.chat-msg-meta').textContent).toBe(archiveTime(message.time));
        expect(row.querySelector('.chat-excerpt-source a').getAttribute('href')).toBe(publicSourceFor(message, entry).url);
        expect(row.textContent).toContain(publicMessageLabel(message));
        if (message.type === 'audio') {
          expect(row.textContent).toContain(message.content_format === 'editorial_summary' ? 'resumo editorial' : 'transcrição parcial publicada');
          expect(row.textContent).not.toContain('transcrição da perícia');
        }
      }
  }, 20000);

  it('does not group excerpts with unknown timestamps as a continuous exchange', () => {
    const message = { id: 1, sender: 'DV', type: 'text', content: 'Trecho', timestamp: null, time: null, date: null, excerpt: true };
    const section = renderDaySection('undated', [message, { ...message, id: 2 }]);
    expect(section.querySelector('.chat-date-badge').textContent).toBe('Data não informada');
    expect(section.querySelectorAll('.is-continuation')).toHaveLength(0);
  });

  it('resolves interleaved partial and exact dates by message ID and splits their shared month chunk', async () => {
    const messages = [
      { id: 1, date: null, reported_date: '2025-05' },
      { id: 2, date: '2025-05-23' },
      { id: 3, date: null, reported_date: '2025-05' },
    ];
    const store = new DataStore({ fetcher: async url => url.endsWith('index.json') ? { dates: [
      { date: '2025-05', first_message_id: 1, last_message_id: 3, message_ids: [1, 3] },
      { date: '2025-05-23', first_message_id: 2, last_message_id: 2, message_ids: [2] },
    ] } : { messages } });
    expect(await store.findDateForMessage('mixed', 2)).toBe('2025-05-23');
    expect((await store.getMessages('mixed', '2025-05')).map(message => message.id)).toEqual([1, 3]);
    expect((await store.getMessages('mixed', '2025-05-23')).map(message => message.id)).toEqual([2]);
    expect(await store.findDateForMessage('mixed', 99)).toBeNull();
  });
});
