import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_ARCHIVED_IDS,
  ARCHIVED_CONVERSATIONS,
  getArchivedSet,
  saveArchivedSet,
  isArchived,
  toggleArchived,
} from '../../src/lib/archived-chats.js';
import { renderSidebar } from '../../src/components/Sidebar.js';
import { HashRouter } from '../../src/lib/router.js';

describe('Archived Chats — WhatsApp Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('archived-chats model and storage', () => {
    it('defines exactly the 5 most relevant chats by default', () => {
      expect(DEFAULT_ARCHIVED_IDS).toEqual([
        'alexandre-de-moraes',
        'martha-graeff',
        'fabio-faria',
        'ciro-daniel-fabio-hugo',
        'diretor-paulo-sergio-bacen',
      ]);
      expect(ARCHIVED_CONVERSATIONS.size).toBe(5);
    });

    it('identifies archived chats correctly with isArchived()', () => {
      expect(isArchived('alexandre-de-moraes')).toBe(true);
      expect(isArchived('martha-graeff')).toBe(true);
      expect(isArchived('fabio-faria')).toBe(true);
      expect(isArchived('ciro-daniel-fabio-hugo')).toBe(true);
      expect(isArchived('diretor-paulo-sergio-bacen')).toBe(true);
      expect(isArchived('outro-contato')).toBe(false);
    });

    it('toggles archived status and updates localStorage', () => {
      const res1 = toggleArchived('novo-chat');
      expect(res1.isArchived).toBe(true);
      expect(getArchivedSet().has('novo-chat')).toBe(true);

      const res2 = toggleArchived('novo-chat');
      expect(res2.isArchived).toBe(false);
      expect(getArchivedSet().has('novo-chat')).toBe(false);
    });
  });

  describe('Sidebar integration', () => {
    const mockConversations = [
      { id: 'alexandre-de-moraes', name: 'Alexandre de Moraes', participants: ['DV', 'Alexandre de Moraes'], total_messages: 62 },
      { id: 'martha-graeff', name: 'Martha Graeff', participants: ['DV', 'Martha Graeff'], total_messages: 65772 },
      { id: 'fabio-faria', name: 'Fábio Faria', participants: ['DV', 'Fábio Faria'], total_messages: 151 },
      { id: 'ciro-daniel-fabio-hugo', name: 'Grupo Político', participants: ['DV', 'Ciro'], total_messages: 21 },
      { id: 'diretor-paulo-sergio-bacen', name: 'Diretor Bacen', participants: ['DV', 'Bacen'], total_messages: 5 },
      { id: 'outro-chat-1', name: 'Outro Contato 1', participants: ['DV', 'Outro 1'], total_messages: 10 },
      { id: 'outro-chat-2', name: 'Outro Contato 2', participants: ['DV', 'Outro 2'], total_messages: 20 },
    ];

    it('renders the WhatsApp archived row at the top of the chat list with count 5', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      const row = el.querySelector('.sidebar-archived-row');
      expect(row).not.toBeNull();
      expect(row.querySelector('.sidebar-archived-label').textContent).toBe('Arquivadas');
      expect(row.querySelector('.sidebar-archived-count').textContent).toBe('5');
    });

    it('renders the Arquivadas filter tag with count', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      const tag = el.querySelector('.sidebar-tag[data-filter="arquivadas"]');
      expect(tag).not.toBeNull();
      expect(tag.querySelector('.sidebar-tag-archived-count').textContent).toBe('5');
    });

    it('hides archived conversations from the main "Todas" list by default', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      const visibleItems = [...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none');
      expect(visibleItems).toHaveLength(2);
      const visibleIds = visibleItems.map(item => item.dataset.id);
      expect(visibleIds).toEqual(['outro-chat-1', 'outro-chat-2']);
    });

    it('filters strictly to the 5 archived chats when clicking the archived row', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      const row = el.querySelector('.sidebar-archived-row');
      row.click();

      const visibleItems = [...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none');
      expect(visibleItems).toHaveLength(5);
      const visibleIds = visibleItems.map(item => item.dataset.id);
      expect(visibleIds).toEqual([
        'alexandre-de-moraes',
        'martha-graeff',
        'fabio-faria',
        'ciro-daniel-fabio-hugo',
        'diretor-paulo-sergio-bacen',
      ]);
    });

    it('restores unarchived conversations in "Todas" when clicking the archived back button', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      el.showArchived();
      expect([...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none')).toHaveLength(5);

      const backBtn = el.querySelector('.sidebar-archived-back-btn');
      backBtn.click();

      const visible = [...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none');
      expect(visible).toHaveLength(2);
      expect(visible.map(item => item.dataset.id)).toEqual(['outro-chat-1', 'outro-chat-2']);
    });

    it('calling showChats() does not kick the user out of the archived view when opening a chat', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      el.showArchived();
      expect([...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none')).toHaveLength(5);

      // Simulates openConversation calling sidebar.showChats()
      el.showChats();
      expect([...el.querySelectorAll('.conversation-item')].filter(item => item.style.display !== 'none')).toHaveLength(5);
    });

    it('marks conversation items with data-archived and pill', () => {
      const container = document.createElement('div');
      const el = renderSidebar(container, {
        conversations: mockConversations,
        onSelect: vi.fn(),
      });

      const martha = el.querySelector('.conversation-item[data-id="martha-graeff"]');
      expect(martha.dataset.archived).toBe('true');
      expect(martha.querySelector('.conversation-item-archived-pill')).not.toBeNull();

      const outro = el.querySelector('.conversation-item[data-id="outro-chat-1"]');
      expect(outro.dataset.archived).toBeUndefined();
      expect(outro.querySelector('.conversation-item-archived-pill')).toBeNull();
    });
  });

  describe('Router integration', () => {
    it('parses #/archived correctly into route "archived"', () => {
      const parsed = HashRouter.parseHash('#/archived');
      expect(parsed).toEqual({ route: 'archived', param: null, messageId: null });
    });

    it('navigates to #/archived via navigate("archived")', () => {
      const router = new HashRouter();
      router.navigate('archived');
      expect(window.location.hash).toBe('#/archived');
      router.stop();
    });
  });
});
