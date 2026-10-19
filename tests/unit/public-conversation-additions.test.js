// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGENDA_CONTACTS } from '../../src/lib/agenda-content.js';

const read = id => JSON.parse(readFileSync(new URL('../../data/conversations/' + id + '.json', import.meta.url), 'utf8'));
const additions = [
  ['roberto-justus', 'Roberto Justus', 6],
  ['davi-alcolumbre', 'Davi Alcolumbre', 3],
  ['benedito-goncalves', 'Benedito Gonçalves', 3],
  ['paulo-henrique-costa', 'Paulo Henrique Costa', 3],
  ['flavio-carneiro', 'Flávio Carneiro', 3],
  ['andre-valadao', 'André Valadão', 3],
  ['chiquinho-feitosa', 'Chiquinho Feitosa', 2],
];

describe('Public conversations added on 19 October 2026', () => {
  it.each(additions)('%s retains documented speakers, sources and gaps', (id, name, count) => {
    const { metadata, messages, index } = read(id);
    expect(metadata.participants).toEqual(['DV', name]);
    expect(metadata.status).toBe('published');
    expect(metadata.publication_ready).toBe(true);
    expect(metadata.total_messages).toBe(messages.length);
    expect(messages.length).toBeGreaterThanOrEqual(count);
    expect(metadata.phone).toBeNull();
    expect(metadata.saved_as).toBeNull();
    expect(metadata.context).toBeTruthy();
    expect(metadata.limitations.length).toBeGreaterThan(0);
    const sources = new Map(metadata.sources.map(source => [source.id, source]));
    expect(sources.size).toBe(metadata.sources.length);
    for (const message of messages) {
      expect(metadata.participants).toContain(message.sender);
      expect(message.excerpt).toBe(true);
      expect(message.content.trim().length).toBeGreaterThan(0);
      expect(message.content).not.toContain('\uFFFD');
      expect(message.source_locator).toBeTruthy();
      expect(sources.has(message.source_id)).toBe(true);
      const source = sources.get(message.source_id);
      expect(new URL(source.url).protocol).toBe('https:');
      expect(source.accessed_at).toBe(metadata.reviewed_at);
      expect(source.published_at <= source.accessed_at).toBe(true);
      if (message.timestamp) {
        expect(message.timestamp).toBe(message.date + 'T' + message.time);
        expect(message.source_image).toMatch(/^https:\/\/static\.poder360\.com\.br\//);
      } else expect(message.time).toBeNull();
      if (message.date) expect(message.reported_date).toBe(message.date);
      else expect(message.reported_date?.length || 0).toBeLessThan(10);
    }
    const dated = [...new Set(messages.map(message => message.date).filter(Boolean))].sort();
    expect(index.dates.map(day => day.date)).toEqual(dated);
    expect(index.undated_message_ids).toEqual(messages.filter(message => !message.date).map(message => message.id));
    expect(index.dates.reduce((sum, day) => sum + day.message_count, index.undated_message_ids.length)).toBe(messages.length);
    expect(metadata.date_range).toEqual({ start: dated[0] || null, end: dated.at(-1) || null });
  });

  it('attributes the requested Justus quotation to December 2024 and preserves the visible September clocks', () => {
    const { messages } = read('roberto-justus');
    expect(messages[0]).toMatchObject({ sender: 'Roberto Justus', content: 'Estou certo que não mereço isso.', date: '2024-12-21', timestamp: null, source_id: 'oglobo-2026-10-19' });
    expect(messages.filter(message => message.id <= 6 && message.timestamp).map(message => message.timestamp)).toEqual([
      '2025-09-01T23:53:41', '2025-09-02T00:45:28', '2025-09-11T21:49:06', '2025-09-11T22:41:35',
    ]);
    expect(messages.at(-1)).toMatchObject({ date: '2025-11-17', date_basis: 'year_context_in_report', timestamp: null });
  });

  it('keeps indirect reports in their own chats and preserves uncertainty about dates and events', () => {
    const carneiro = read('flavio-carneiro');
    expect(carneiro.messages.find(message => message.id === 1)).toMatchObject({ sender: 'DV', reported_date: '2024-04', date: null });
    expect(read('andre-valadao').messages.find(message => message.id === 2).type).toBe('audio');
    expect(read('paulo-henrique-costa').messages.every(message => message.date === null && message.reported_date === null)).toBe(true);
    const feitosa = read('chiquinho-feitosa');
    expect(feitosa.metadata.context).toContain('negaram');
    expect(feitosa.messages.every(message => ['DV', 'Chiquinho Feitosa'].includes(message.sender))).toBe(true);
  });

  it('opens the new conversations from their existing agenda entries, including the BRB alias', () => {
    for (const [agendaId, conversationId] of [
      ['davi-alcolumbre', 'davi-alcolumbre'],
      ['benedito-goncalves', 'benedito-goncalves'],
      ['paulo-henrique-brb', 'paulo-henrique-costa'],
    ]) {
      expect(AGENDA_CONTACTS.find(contact => contact.id === agendaId)).toMatchObject({ hasConversation: true, conversationId });
    }
  });
});
