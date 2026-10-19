import { normalize } from './search-engine.js';

/** Mark the matched text without replacing links or other message markup. */
export function highlightMessageText(message, query) {
  const content = message.querySelector('.chat-msg-content-text');
  if (!content || !query) return null;
  const walker = document.createTreeWalker(content, 4, {
    acceptNode: node => node.parentElement.closest('.chat-view-once-tag') ? 2 : 1,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const original = nodes.map(node => node.data).join('');
  const normalized = normalize(original);
  const needle = normalize(query);
  let start = normalized.indexOf(needle);
  if (start < 0 || !needle) return null;
  let end = start + needle.length;
  if (normalized.length !== original.length) {
    let offset = 0, normalizedOffset = 0, originalStart = null;
    for (const character of original) {
      const length = normalize(character).length;
      if (originalStart === null && length && normalizedOffset + length > start) originalStart = offset;
      offset += character.length;
      normalizedOffset += length;
      if (normalizedOffset >= end) {
        end = offset + (original.slice(offset).match(/^\p{M}*/u)?.[0].length || 0);
        break;
      }
    }
    start = originalStart ?? start;
  }
  let offset = 0, firstMark = null;
  for (const node of nodes) {
    const length = node.data.length;
    const from = Math.max(0, start - offset), to = Math.min(length, end - offset);
    if (from < to) {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const mark = document.createElement('mark');
      mark.className = 'message-search-match';
      range.surroundContents(mark);
      firstMark ||= mark;
    }
    offset += length;
    if (offset >= end) break;
  }
  return firstMark;
}

export function clearMessageTextHighlight(message) {
  for (const mark of message.querySelectorAll('.message-search-match')) {
    const parent = mark.parentNode;
    mark.replaceWith(...mark.childNodes);
    parent.normalize();
  }
}
