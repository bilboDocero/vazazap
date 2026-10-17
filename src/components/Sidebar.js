/**
 * Sidebar component — renders the conversation list panel.
 *
 * Security note: innerHTML is used with static SVGs and data from our own
 * bundled JSON files (not user input), so XSS risk does not apply here.
 */
import { formatTime, escapeHtml, formatNumber, formatRelativeDate } from '../lib/utils.js';

import { ICON_SEARCH as SEARCH_ICON, ICON_MEETBALL } from '../lib/icons.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { ICON_CHAT, ICON_CALLS, ICON_STATUS, ICON_CHANNELS } from './NavRail.js';

/**
 * The two conversations pinned under "Favoritas" — the leaks this project is
 * actually about. Everything else is context around them.
 */
export const FAVORITE_CONVERSATIONS = new Set(['alexandre-de-moraes', 'martha-graeff']);

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {Array} options.conversations
 * @param {function} options.onSelect - called with conversation id
 * @param {Set<string>} [options.readConversations] - ids already opened
 */
export function renderSidebar(container, { conversations, onSelect, onProfile, onAbout, onExportAll, onCalls, onChats, onStatus, onChannels, readConversations = new Set() }) {
  const el = document.createElement('aside');
  el.className = 'sidebar';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Lista de conversas');

  // Static sidebar chrome — safe innerHTML (no user input)
  el.innerHTML = `
    <div class="sidebar-header">
      <span class="sidebar-header-title">Conversas</span>
      <button class="sidebar-find-btn" aria-label="Encontrar conversa" title="Encontrar conversa">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11v6a2 2 0 0 1-2 2H8l-5 3V5a2 2 0 0 1 2-2h8M19 2v6m-3-3h6"/></svg>
      </button>
      <button class="sidebar-menu-btn" aria-label="Menu">${ICON_MEETBALL}</button>
    </div>
    <div class="sidebar-search">
      <div class="sidebar-search-wrapper">
        <span class="sidebar-search-icon">${SEARCH_ICON}</span>
        <input
          type="text"
          class="sidebar-search-input"
          placeholder="Pesquisar nas favoritas"
          aria-label="Pesquisar conversas"
        />
        <button class="sidebar-search-clear" aria-label="Limpar pesquisa" style="display:none;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="sidebar-tags">
      <button class="sidebar-tag active" data-filter="todas">Todas</button>
      <button class="sidebar-tag" data-filter="nao-lidas">Não lidas <span class="sidebar-tag-count"></span></button>
      <button class="sidebar-tag" data-filter="favoritas">Favoritas</button>
      <button class="sidebar-tag disabled" disabled title="Este acervo não contém grupos">Grupos</button>
    </div>
    <div class="conversation-list" role="list"></div>
  `;

  const list = el.querySelector('.conversation-list');
  const searchInput = el.querySelector('.sidebar-search-input');
  const searchClear = el.querySelector('.sidebar-search-clear');
  el.querySelector('.sidebar-find-btn').addEventListener('click', () => searchInput.focus());

  // Show/hide clear button based on input content
  searchInput.addEventListener('input', () => {
    searchClear.style.display = searchInput.value.length > 0 ? '' : 'none';
  });

  // Clear button: clear text, hide results, restore chat list
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchClear.style.display = 'none';
    searchInput.blur();
  });

  for (const conv of conversations) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.id = conv.id;
    if (FAVORITE_CONVERSATIONS.has(conv.id)) item.dataset.favorite = 'true';

    const lastDate = conv.last_message?.timestamp
      ? conv.last_message.timestamp.split('T')[0]
      : '';
    const lastTimeLabel = lastDate ? formatRelativeDate(lastDate) : '';

    const lastPreview = escapeHtml(conv.last_message?.content || '');
    const displayName = escapeHtml(
      conv.participants.find(p => p !== 'DV') || conv.participants[0]
    );
    const msgCount = conv.total_messages ? formatNumber(conv.total_messages) : '';

    // Use real avatar if available, otherwise default SVG
    const avatarHtml = conv.avatar
      ? `<img src="${conv.avatar}" alt="${displayName}" class="conversation-item-avatar-img" />`
      : defaultAvatarSvg(conv.id);

    // Escaped user-facing data inserted via innerHTML
    item.innerHTML = `
      <div class="conversation-item-avatar">${avatarHtml}</div>
      <div class="conversation-item-content">
        <div class="conversation-item-top">
          <span class="conversation-item-name">${displayName}</span>
          <span class="conversation-item-time">${lastTimeLabel}</span>
        </div>
        <div class="conversation-item-bottom">
          <span class="conversation-item-preview">${lastPreview}</span>
          <span class="conversation-item-unread" data-conv-id="${conv.id}">${msgCount}</span>
        </div>
      </div>
    `;

    item.addEventListener('click', () => onSelect(conv.id));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(conv.id);
      }
    });

    list.appendChild(item);
  }

  // Lock message right after the last conversation — inside the scrollable list
  const lockMsg = document.createElement('div');
  lockMsg.className = 'sidebar-lock-message';
  // Static content — safe innerHTML
  lockMsg.innerHTML = `
    <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>
    <span>MasterWhats · Acervo de <span class="sidebar-lock-link" data-action="profile-dv"><strong>Daniel Vorcaro</strong></span></span>
  `;
  list.appendChild(lockMsg);

  // Shown when a filter leaves nothing on screen.
  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'sidebar-empty-filter';
  emptyMsg.style.display = 'none';
  list.appendChild(emptyMsg);

  // ── Filter tabs ────────────────────────────────────
  //
  // The tabs used to be decorative. They now actually filter, and the unread
  // tally follows the read state instead of being a fixed total.

  const tagButtons = [...el.querySelectorAll('.sidebar-tag[data-filter]')];
  const unreadCountEl = el.querySelector('.sidebar-tag-count');
  let activeFilter = 'todas';

  const isUnread = (conv) => !readConversations.has(conv.id);

  function matchesFilter(conv) {
    if (activeFilter === 'nao-lidas') return isUnread(conv);
    if (activeFilter === 'favoritas') return FAVORITE_CONVERSATIONS.has(conv.id);
    return true;
  }

  /** Refresh the unread badges, the tab tally and — if filtering by unread —
   *  which rows are on screen. */
  function refreshReadState() {
    const unread = conversations.filter(isUnread);
    const unreadMessages = unread.reduce((sum, c) => sum + (c.total_messages || 0), 0);

    unreadCountEl.textContent = unreadMessages ? unreadMessages.toLocaleString('pt-BR') : '';
    unreadCountEl.style.display = unreadMessages ? '' : 'none';

    for (const item of el.querySelectorAll('.conversation-item')) {
      item.classList.toggle('is-unread', !readConversations.has(item.dataset.id));
      const badge = item.querySelector('.conversation-item-unread');
      if (badge) badge.style.display = readConversations.has(item.dataset.id) ? 'none' : '';
    }

    applyFilter();
  }

  function applyFilter() {
    const byId = new Map(conversations.map(c => [c.id, c]));
    let visible = 0;

    for (const item of el.querySelectorAll('.conversation-item')) {
      const conv = byId.get(item.dataset.id);
      const show = conv ? matchesFilter(conv) : true;
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    }

    emptyMsg.style.display = visible ? 'none' : '';
    emptyMsg.textContent = activeFilter === 'nao-lidas'
      ? 'Você já abriu todas as conversas.'
      : 'Nenhuma conversa aqui.';
    // The lock note belongs at the end of the real list, not of an empty one.
    lockMsg.style.display = visible ? '' : 'none';
  }

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      tagButtons.forEach(b => b.classList.toggle('active', b === btn));
      tagButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      searchInput.placeholder = activeFilter === 'favoritas'
        ? 'Pesquisar nas favoritas'
        : 'Pesquisar';
      applyFilter();
      list.scrollTop = 0;
    });
  }

  searchInput.placeholder = 'Pesquisar';
  tagButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === activeFilter)));
  refreshReadState();

  // main.js marks a conversation read when it opens; this lets it repaint the
  // badges and the tally without rebuilding the whole sidebar.
  el.refreshReadState = refreshReadState;

  // Mobile bottom navbar (hidden on desktop via CSS)
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'sidebar-bottom-nav';
  bottomNav.setAttribute('aria-label', 'Seções');
  for (const [key, label, icon, action] of [
    ['chats', 'Conversas', ICON_CHAT, onChats],
    ['status', 'Status', ICON_STATUS, onStatus],
    ['channels', 'Canais', ICON_CHANNELS, onChannels],
    ['calls', 'Chamadas', ICON_CALLS, onCalls],
  ]) {
    const tab = document.createElement('button');
    tab.className = 'sidebar-bottom-tab';
    tab.dataset.tab = key;
    tab.setAttribute('aria-label', label);
    tab.innerHTML = `${icon}<span>${label}</span>`; // Static SVGs and labels.
    tab.addEventListener('click', () => action?.());
    bottomNav.appendChild(tab);
  }
  el.appendChild(bottomNav);

  function selectTab(key) {
    for (const tab of bottomNav.querySelectorAll('.sidebar-bottom-tab')) {
      tab.classList.toggle('active', tab.dataset.tab === key);
      if (tab.dataset.tab === key) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  }
  selectTab('chats');

  el.showSection = (kind, panel) => {
    closeSidebarMenu();
    el.querySelectorAll('.calls-panel, .updates-panel').forEach(p => p.remove());
    el.insertBefore(panel, bottomNav);
    el.classList.add('sidebar--section');
    el.classList.toggle('sidebar--calls', kind === 'calls');
    selectTab(kind);
  };
  el.showCalls = panel => el.showSection('calls', panel);
  el.showChats = () => {
    el.classList.remove('sidebar--calls', 'sidebar--section');
    el.querySelectorAll('.calls-panel, .updates-panel').forEach(p => p.remove());
    selectTab('chats');
  };

  // Sidebar 3-dot menu (mobile only, hidden on desktop via CSS)
  const menuBtn = el.querySelector('.sidebar-menu-btn');
  let sidebarMenuEl = null;

  function toggleSidebarMenu() {
    if (sidebarMenuEl) { closeSidebarMenu(); return; }
    sidebarMenuEl = document.createElement('div');
    sidebarMenuEl.className = 'sidebar-dropdown-menu';

    const items = [
      { label: 'Perfil', action: onProfile, enabled: !!onProfile },
      { label: 'Exportar tudo (.zip)', action: onExportAll, enabled: !!onExportAll },
      { label: 'Sobre o MasterWhats', action: onAbout, enabled: !!onAbout },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'sidebar-dropdown-item';
      if (!item.enabled) btn.classList.add('disabled');
      btn.textContent = item.label;
      if (item.enabled && item.action) {
        btn.addEventListener('click', () => { closeSidebarMenu(); item.action(); });
      }
      sidebarMenuEl.appendChild(btn);
    }

    el.querySelector('.sidebar-header').appendChild(sidebarMenuEl);

    setTimeout(() => {
      document.addEventListener('click', closeSidebarMenuOnOutside, true);
    }, 0);
  }

  function closeSidebarMenu() {
    if (sidebarMenuEl) { sidebarMenuEl.remove(); sidebarMenuEl = null; }
    document.removeEventListener('click', closeSidebarMenuOnOutside, true);
  }

  function closeSidebarMenuOnOutside(e) {
    if (sidebarMenuEl && !sidebarMenuEl.contains(e.target) && e.target !== menuBtn) {
      closeSidebarMenu();
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarMenu();
    });
  }

  container.appendChild(el);
  return el;
}

/**
 * Set active conversation in sidebar.
 * @param {HTMLElement} sidebar
 * @param {string|null} activeId
 */
export function setActiveConversation(sidebar, activeId) {
  sidebar.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === activeId);
  });
  // Badges and the unread tally follow the stored read state, repainted by
  // refreshReadState() once main.js has recorded the open.
}
