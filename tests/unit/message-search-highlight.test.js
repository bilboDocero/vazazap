import { describe, expect, it } from 'vitest';
import { highlightMessageText, clearMessageTextHighlight } from '../../src/lib/message-search-highlight.js';

describe('matching text inside a rendered message', () => {
  it('marks a phrase across a link while preserving its destination and text', () => {
    const message = document.createElement('div');
    message.innerHTML = '<div class="chat-msg-content-text">Visitando <a href="https://example.com">São</a> Paulo amanhã</div>';
    const original = message.textContent;
    expect(highlightMessageText(message, 'sao paulo').textContent).toBe('São');
    expect([...message.querySelectorAll('mark')].map(mark => mark.textContent).join('')).toBe('São Paulo');
    expect(message.querySelector('a').getAttribute('href')).toBe('https://example.com');
    clearMessageTextHighlight(message);
    expect(message.textContent).toBe(original);
    expect(message.querySelectorAll('mark')).toHaveLength(0);
  });
  it('keeps decomposed accents in the original match', () => {
    const message = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'chat-msg-content-text';
    content.textContent = 'Um cafe\u0301 para voce\u0302';
    message.appendChild(content);
    expect(highlightMessageText(message, 'voce').textContent).toBe('voce\u0302');
  });
  it('does not change the message when the query does not match', () => {
    const message = document.createElement('div');
    message.innerHTML = '<div class="chat-msg-content-text">Olá</div>';
    expect(highlightMessageText(message, 'ausente')).toBeNull();
    expect(message.querySelectorAll('mark')).toHaveLength(0);
  });
});
