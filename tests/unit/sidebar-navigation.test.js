import { describe, it, expect } from 'vitest';
import { renderSidebar } from '../../src/components/Sidebar.js';

function sidebar() {
  return renderSidebar(document.createElement('div'), { conversations: [], onSelect: () => {} });
}

function expectSelected(el, key) {
  const tabs = el.querySelectorAll('.sidebar-bottom-tab');
  expect([...tabs].filter(tab => tab.classList.contains('active'))).toHaveLength(1);
  expect([...tabs].filter(tab => tab.getAttribute('aria-current') === 'page')).toHaveLength(1);
  for (const tab of tabs) {
    expect(tab.classList.contains('active')).toBe(tab.dataset.tab === key);
    expect(tab.getAttribute('aria-current')).toBe(tab.dataset.tab === key ? 'page' : null);
  }
}

describe('Sidebar navigation selection', () => {
  it('moves the selected state through every section after removing the calls filter', () => {
    const el = sidebar();
    expect(el.querySelector('.sidebar-tags [data-action="calls"]')).toBeNull();
    expectSelected(el, 'chats');
    for (const [key, className] of [
      ['status', 'updates-panel'], ['calls', 'calls-panel'],
      ['communities', 'communities-panel'], ['vitrine', 'vitrine-panel'],
      ['anunciar', 'commercial-panel'],
    ]) {
      const panel = document.createElement('section');
      panel.className = className;
      el.showSection(key, panel);
      expectSelected(el, key);
      expect(el.contains(panel)).toBe(true);
    }
  });

  it('restores Conversations after leaving another section', () => {
    const el = sidebar();
    const panel = document.createElement('section');
    panel.className = 'calls-panel';
    el.showCalls(panel);
    el.showChats();
    expectSelected(el, 'chats');
    expect(el.querySelector('.calls-panel')).toBeNull();
    expect(el.classList.contains('sidebar--section')).toBe(false);
  });
});
