// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const directory = new URL('../../data/conversations/backup/', import.meta.url);
const files = readdirSync(directory).filter(name => name.endsWith('.json'));
const conversations = files.map(name => [name, JSON.parse(readFileSync(new URL(name, directory), 'utf8'))]);

describe('Public-source excerpts in standby', () => {
  it.each(conversations)('%s keeps every excerpt traceable and marks unknown metadata explicitly', (_name, data) => {
    const { metadata, messages } = data;
    expect(metadata.status).toBe('standby');
    expect(metadata.publication_ready).toBe(false);
    expect(metadata.coverage).toBe('selected_public_excerpts');
    expect(metadata.schema_version).toBe(2);
    expect(metadata.phone).toBeNull();
    expect(metadata.saved_as).toBeNull();
    expect(metadata.total_messages).toBe(messages.length);
    expect(metadata.context).toBeTruthy();
    expect(metadata.limitations.length).toBeGreaterThan(0);
    expect(new Set(messages.map(message => message.id)).size).toBe(messages.length);
    const sources = new Map(metadata.sources.map(source => [source.id, source]));
    expect(sources.size).toBe(metadata.sources.length);
    for (const source of sources.values()) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(source.publisher).toBeTruthy();
      expect(source.description).toBeTruthy();
      expect(source.accessed_at).toBe(metadata.reviewed_at);
      for (const date of [source.published_at, source.document_date].filter(Boolean)) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(date <= source.accessed_at).toBe(true);
      }
      if (source.kind === 'court_decision_mirror') {
        expect(source.hosted_by).toBeTruthy();
        expect(new URL(source.authentication_url).hostname).toBe('www.stf.jus.br');
        expect(source.authentication_code).toBeTruthy();
        expect(source.published_at).toBeNull();
      }
    }
    for (const message of messages) {
      expect(metadata.participants).toContain(message.sender);
      expect(message.content.trim().length).toBeGreaterThan(0);
      expect(message.content).not.toContain('\uFFFD');
      expect(message.excerpt).toBe(true);
      expect(sources.has(message.source_id)).toBe(true);
      expect(message.source_locator).toBeTruthy();
      expect(['text', 'audio']).toContain(message.type);
      expect(message.time).toBeNull();
      expect(message.timestamp).toBeNull();
      expect(message.is_edited).toBeNull();
      expect(message.attachment).toBeNull();
      if (message.reported_date !== null) {
        expect(message.reported_date).toMatch(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/);
        const padded = message.reported_date.padEnd(10, '-01');
        expect(Number.isNaN(Date.parse(padded))).toBe(false);
        expect(message.reported_date <= metadata.reviewed_at).toBe(true);
      }
      if (message.date !== null) expect(message.date).toBe(message.reported_date);
      else expect(message.reported_date?.length || 0).toBeLessThan(10);
    }
  });

  it.each(conversations)('%s indexes every excerpt once without assigning dates to undated records', (_name, { metadata, messages, index }) => {
    const knownDates = [...new Set(messages.map(message => message.date).filter(Boolean))].sort();
    expect(index.dates.map(day => day.date)).toEqual(knownDates);
    const covered = [...index.undated_message_ids];
    expect(index.undated_message_ids).toEqual(messages.filter(message => !message.date).map(message => message.id));
    for (const day of index.dates) {
      const group = messages.filter(message => message.date === day.date);
      expect(day.message_count).toBe(group.length);
      expect(day.first_message_id).toBe(group[0].id);
      expect(day.last_message_id).toBe(group.at(-1).id);
      covered.push(...group.map(message => message.id));
    }
    expect(covered.sort((a, b) => a - b)).toEqual(messages.map(message => message.id).sort((a, b) => a - b));
    expect(metadata.date_range).toEqual({ start: knownDates[0] || null, end: knownDates.at(-1) || null });
    expect(metadata.date_range_complete).toBe(messages.every(message => message.date !== null));
  });

  it('preserves the corrected speaker and distinguishes an audio excerpt from a text message', () => {
    const hugo = conversations.find(([name]) => name === 'hugo-motta.json')[1];
    const monaco = hugo.messages.find(message => message.content.includes('Monaco'));
    expect(monaco.sender).toBe('DV');
    expect(monaco.date).toBe('2025-05-23');
    const nikolas = conversations.find(([name]) => name === 'nikolas-ferreira.json')[1];
    expect(nikolas.messages.find(message => message.sender === 'Nikolas Ferreira').type).toBe('audio');
    expect(nikolas.messages.some(message => /lindão/i.test(message.content))).toBe(false);
    expect(nikolas.messages.find(message => message.date_basis)?.date).toBe('2025-04-01');
  });

  it('publishes only explicitly promoted copies while retaining the standby originals', () => {
    const publicDirectory = new URL('../../public/data/', import.meta.url);
    const catalog = JSON.parse(readFileSync(new URL('conversations.json', publicDirectory), 'utf8'));
    const manifest = JSON.parse(readFileSync(new URL('search-manifest.json', publicDirectory), 'utf8'));
    const corpus = JSON.parse(readFileSync(new URL(manifest.file, publicDirectory), 'utf8'));
    const publishedIds = [...catalog.conversations.map(conversation => conversation.id), ...corpus.conversations.map(conversation => conversation.id)];
    for (const file of files) {
      const live = JSON.parse(readFileSync(new URL('../' + file, directory), 'utf8'));
      const backup = conversations.find(([name]) => name === file)[1];
      expect(live.metadata.status).toBe('published');
      expect(live.metadata.publication_ready).toBe(true);
      expect(live.messages).toEqual(backup.messages);
      expect(publishedIds.filter(id => id === file.slice(0, -5))).toHaveLength(2);
    }
  });
});
