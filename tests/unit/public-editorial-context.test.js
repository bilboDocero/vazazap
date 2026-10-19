import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderMessage } from '../../src/components/ChatView.js';
import { SearchEngine } from '../../src/lib/search-engine.js';
import { highlightMessageText, clearMessageTextHighlight } from '../../src/lib/message-search-highlight.js';
import { messageSearchText } from '../../src/lib/message-date.js';

const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const catalog = read('public/data/conversations.json').conversations;
const manifest = read('public/data/search-manifest.json');

describe('Editorial context of published messages', () => {
  it('finds and highlights context without changing the original quotation or its source link', async () => {
    const entry = catalog.find(entry => entry.id === 'roberto-justus');
    const original = read('data/conversations/roberto-justus.json').messages.find(message => message.id === 2);
    const engine = await new SearchEngine(read('public/data/' + manifest.file)).prepare();
    const page = await engine.search('sobrevivência da SteelCorp', { conversationId: entry.id });
    expect(page.results.find(result => result.id === 2)).toMatchObject({ content_format: 'excerpt_with_context', excerpt: true });
    const row = renderMessage(original, false, entry);
    expect(row.querySelector('.chat-msg-content-text').textContent).toBe(original.content);
    expect(highlightMessageText(row, 'sobrevivencia da steelcorp').textContent).toBe('sobrevivência da SteelCorp');
    expect(row.querySelector('mark').closest('.chat-editorial-text')).toBeTruthy();
    expect(row.querySelector('.chat-excerpt-source a').href).toBe(entry.sources.find(source => source.id === original.source_id).url);
    clearMessageTextHighlight(row);
    expect(row.querySelector('.chat-editorial-text').textContent).toBe(original.editorial_context);
  });

  it('identifies an audio summary before its text and does not wrap it as a literal quotation', () => {
    const entry = catalog.find(entry => entry.id === 'flavio-bolsonaro');
    const message = read('data/conversations/flavio-bolsonaro.json').messages.find(message => message.content_format === 'editorial_summary' && message.type === 'audio');
    const row = renderMessage(message, false, entry);
    expect(row.querySelector('.chat-msg-bubble').firstElementChild.className).toBe('chat-excerpt-source');
    expect(row.querySelector('.chat-audio-transcript').textContent).toBe(message.content);
    expect(row.textContent).toContain('Áudio não disponível · resumo editorial');
    expect(row.textContent).not.toContain('transcrição da perícia');
    expect(highlightMessageText(row, 'elenco e direção')).toBeTruthy();
  });

  it('keeps the expanded originals, representation and captures in the JSON and Markdown exports', () => {
    const exported = read('dist/export/vorcarozap-roberto-justus.json');
    const original = read('data/conversations/roberto-justus.json');
    expect(exported.messages.map(messageSearchText)).toEqual(original.messages.map(messageSearchText));
    expect(exported.conversation.source_captures).toEqual(original.metadata.source_captures);
    expect(exported.conversation.public_review.complete_history).toBe(false);
    const md = readFileSync(new URL('../../' + 'dist/export/vorcarozap-roberto-justus.md', import.meta.url), 'utf8');
    expect(md).toContain('resumo editorial');
    expect(md).toContain('Contexto da mensagem');
    const html = readFileSync(new URL('../../' + 'dist/chat/roberto-justus/index.html', import.meta.url), 'utf8');
    expect(html).toContain('Resumo editorial');
    expect(html).toContain('Captura original');
  });
});
