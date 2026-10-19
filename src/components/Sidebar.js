/**
 * Sidebar component — renders the conversation list panel.
 *
 * Security note: innerHTML is used with static SVGs and data from our own
 * bundled JSON files (not user input), so XSS risk does not apply here.
 */
import { formatTime, escapeHtml, formatNumber, formatRelativeDate } from '../lib/utils.js';
import { highlightNavigationShortcut } from '../lib/navigation-highlights.js';

import { ICON_SEARCH as SEARCH_ICON, ICON_MEETBALL, ICON_ARCHIVE } from '../lib/icons.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { ICON_CHAT, ICON_CALLS, ICON_STATUS, ICON_CHANNELS, ICON_COMMUNITIES, ICON_STORE, ICON_ADVERTISE } from './NavRail.js';
import { getArchivedSet, saveArchivedSet, toggleArchived, ARCHIVED_CONVERSATIONS, DEFAULT_ARCHIVED_IDS } from '../lib/archived-chats.js';
import { showToast } from './Toast.js';

export { ARCHIVED_CONVERSATIONS, DEFAULT_ARCHIVED_IDS };

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
export function renderSidebar(container, { conversations, onSelect, onProfile, onAbout, onExportAll, onCalls, onChats, onStatus, onChannels, onCommunities, onVitrine, onAnunciar, onAgenda, onArchived, readConversations = new Set() }) {
  const el = document.createElement('aside');
  el.className = 'sidebar';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Lista de conversas');

  // Static sidebar chrome — safe innerHTML (no user input)
  el.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-header-main" style="display:flex; align-items:center; width:100%; justify-content:space-between;">
        <span class="sidebar-header-title">Conversas</span>
        <button class="sidebar-find-btn" aria-label="Agenda de contatos" title="Nova conversa · Agenda de contatos">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11v6a2 2 0 0 1-2 2H8l-5 3V5a2 2 0 0 1 2-2h8M19 2v6m-3-3h6"/></svg>
        </button>
        <button class="sidebar-menu-btn" aria-label="Menu">${ICON_MEETBALL}</button>
      </div>
      <div class="sidebar-header-archived" style="display:none; align-items:center; width:100%;">
        <button class="sidebar-archived-back-btn" aria-label="Voltar para todas as conversas" title="Voltar">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="sidebar-header-title">Arquivadas</span>
      </div>
    </div>
    <div class="sidebar-search">
      <div class="sidebar-search-wrapper">
        <span class="sidebar-search-icon">${SEARCH_ICON}</span>
        <input
          type="text"
          class="sidebar-search-input"
          placeholder="Pesquisar mensagens"
          aria-label="Pesquisar mensagens em todas as conversas"
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
      <button class="sidebar-tag" data-filter="grupos">Grupos</button>
      <button class="sidebar-tag" data-filter="arquivadas">Arquivadas <span class="sidebar-tag-archived-count">5</span></button>
    </div>
    <div class="conversation-list" role="list"></div>
  `;

  const list = el.querySelector('.conversation-list');
  const searchInput = el.querySelector('.sidebar-search-input');
  const searchClear = el.querySelector('.sidebar-search-clear');
  const headerMain = el.querySelector('.sidebar-header-main');
  const headerArchived = el.querySelector('.sidebar-header-archived');
  const backBtn = el.querySelector('.sidebar-archived-back-btn');
  let archivedSet = getArchivedSet();
  let activeConversationMenu = null;

  function closeConversationContextMenu() {
    if (activeConversationMenu) {
      activeConversationMenu.remove();
      activeConversationMenu = null;
    }
  }

  el.querySelector('.sidebar-find-btn').addEventListener('click', () => {
    if (onAgenda) onAgenda();
    else searchInput.focus();
  });

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

  // ── WhatsApp Archived Row & Banner ───────────────────
  const archivedRow = document.createElement('div');
  archivedRow.className = 'sidebar-archived-row';
  archivedRow.setAttribute('role', 'button');
  archivedRow.setAttribute('tabindex', '0');
  archivedRow.title = 'Conversas arquivadas';
  archivedRow.innerHTML = `
    <span class="sidebar-archived-icon">${ICON_ARCHIVE}</span>
    <span class="sidebar-archived-label">Arquivadas</span>
    <span class="sidebar-archived-count">5</span>
  `;
  list.appendChild(archivedRow);

  const archivedBanner = document.createElement('div');
  archivedBanner.className = 'sidebar-archived-banner';
  archivedBanner.style.display = 'none';
  archivedBanner.innerHTML = `<span>Estas conversas permanecem arquivadas quando você recebe novas mensagens.</span>`;
  list.appendChild(archivedBanner);

  const archivedRowCountEl = archivedRow.querySelector('.sidebar-archived-count');
  const archivedTagCountEl = el.querySelector('.sidebar-tag-archived-count');

  for (const conv of conversations) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.id = conv.id;
    if (FAVORITE_CONVERSATIONS.has(conv.id)) item.dataset.favorite = 'true';
    const isConvArchived = archivedSet.has(conv.id);
    if (isConvArchived) item.dataset.archived = 'true';

    const lastDate = conv.last_message?.timestamp
      ? conv.last_message.timestamp.split('T')[0]
      : (conv.last_message?.date || '');
    const lastTimeLabel = lastDate ? formatRelativeDate(lastDate) : '';

    const lastPreview = escapeHtml(conv.last_message?.content || '');
    const displayName = escapeHtml(
      conv.group_name || conv.name || (conv.participants.find(p => p !== 'DV') || conv.participants[0])
    );
    const msgCount = conv.total_messages ? formatNumber(conv.total_messages) : '';

    // Use real avatar if available, otherwise default SVG
    const avatarHtml = conv.avatar
      ? `<img src="${conv.avatar}" alt="${displayName}" class="conversation-item-avatar-img" loading="lazy" decoding="async" />`
      : defaultAvatarSvg(conv.id);

    const archivedPill = isConvArchived
      ? `<span class="conversation-item-archived-pill" title="Conversa arquivada">${ICON_ARCHIVE}</span>`
      : '';

    // Escaped user-facing data inserted via innerHTML
    item.innerHTML = `
      <div class="conversation-item-avatar">${avatarHtml}</div>
      <div class="conversation-item-content">
        <div class="conversation-item-top">
          <span class="conversation-item-name">${displayName}${archivedPill}</span>
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

    // Context Menu on Conversation (Right-click to archive/unarchive)
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      closeConversationContextMenu();
      closeSidebarMenu();

      const menu = document.createElement('div');
      menu.className = 'conversation-context-menu';

      const isArch = archivedSet.has(conv.id);
      const actionText = isArch ? 'Desarquivar conversa' : 'Arquivar conversa';

      menu.innerHTML = `
        <button type="button" class="conversation-context-item action-archive">
          <span class="conversation-context-icon">${ICON_ARCHIVE}</span>
          <span>${actionText}</span>
        </button>
      `;

      menu.querySelector('.action-archive').addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeConversationContextMenu();
        const res = toggleArchived(conv.id);
        archivedSet = res.set;
        item.dataset.archived = res.isArchived ? 'true' : 'false';
        const pill = item.querySelector('.conversation-item-archived-pill');
        if (res.isArchived && !pill) {
          const nameEl = item.querySelector('.conversation-item-name');
          if (nameEl) nameEl.insertAdjacentHTML('beforeend', `<span class="conversation-item-archived-pill" title="Conversa arquivada">${ICON_ARCHIVE}</span>`);
        } else if (!res.isArchived && pill) {
          pill.remove();
        }
        refreshArchivedCount();
        applyFilter();
        showToast(container, res.isArchived ? 'Conversa arquivada' : 'Conversa desarquivada');
      });

      document.body.appendChild(menu);

      const rect = menu.getBoundingClientRect();
      const x = Math.min(e.clientX, window.innerWidth - rect.width - 12);
      const y = Math.min(e.clientY, window.innerHeight - rect.height - 12);
      menu.style.left = `${Math.max(12, x)}px`;
      menu.style.top = `${Math.max(12, y)}px`;

      activeConversationMenu = menu;
      setTimeout(() => {
        document.addEventListener('click', closeConversationContextMenu, { once: true });
      }, 0);
    });

    list.appendChild(item);
  }

  // Lock message right after the last conversation — inside the scrollable list
  const lockMsg = document.createElement('div');
  lockMsg.className = 'sidebar-lock-message';
  // Static content — safe innerHTML
  lockMsg.innerHTML = `
    <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>
    <span>Acervo de <span class="sidebar-lock-link" data-action="profile-dv"><strong>Daniel Vorcaro</strong></span></span>
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
    if (activeFilter === 'arquivadas') return archivedSet.has(conv.id);
    if (activeFilter === 'nao-lidas') return isUnread(conv) && !archivedSet.has(conv.id);
    if (activeFilter === 'favoritas') return FAVORITE_CONVERSATIONS.has(conv.id);
    if (activeFilter === 'grupos') return Boolean(conv.is_group || conv.group_name || conv.id === 'ciro-daniel-fabio-hugo') && !archivedSet.has(conv.id);
    return !archivedSet.has(conv.id);
  }

  function refreshArchivedCount() {
    const totalArchived = conversations.filter(c => archivedSet.has(c.id)).length;
    const unreadArchived = conversations.filter(c => archivedSet.has(c.id) && isUnread(c)).length;
    if (archivedRowCountEl) {
      archivedRowCountEl.textContent = String(totalArchived);
      archivedRowCountEl.classList.toggle('has-unread', unreadArchived > 0);
    }
    if (archivedTagCountEl) {
      archivedTagCountEl.textContent = String(totalArchived);
    }
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

    refreshArchivedCount();
    applyFilter();
  }

  function applyFilter() {
    const isArchived = activeFilter === 'arquivadas';
    if (headerMain) headerMain.style.display = isArchived ? 'none' : 'flex';
    if (headerArchived) headerArchived.style.display = isArchived ? 'flex' : 'none';
    if (archivedBanner) archivedBanner.style.display = isArchived ? '' : 'none';
    if (archivedRow) archivedRow.style.display = isArchived ? 'none' : '';
    if (archivedRow) archivedRow.classList.toggle('active', isArchived);
    searchInput.placeholder = isArchived ? 'Pesquisar conversas arquivadas' : 'Pesquisar mensagens';

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
      : (activeFilter === 'grupos'
          ? 'Nenhum grupo encontrado.'
          : (activeFilter === 'favoritas'
              ? 'Nenhuma conversa favorita.'
              : (activeFilter === 'arquivadas'
                  ? 'Nenhuma conversa arquivada.'
                  : 'Nenhuma conversa aqui.')));
    // The lock note belongs at the end of the real list, not of an empty one.
    lockMsg.style.display = visible ? '' : 'none';
    if (isArchived) {
      lockMsg.innerHTML = `
        <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>
        <span>${archivedSet.size} conversas arquivadas de relevância histórica</span>
      `;
    } else {
      lockMsg.innerHTML = `
        <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>
        <span>Acervo de <span class="sidebar-lock-link" data-action="profile-dv"><strong>Daniel Vorcaro</strong></span></span>
      `;
      const link = lockMsg.querySelector('.sidebar-lock-link');
      if (link && onProfile) link.addEventListener('click', onProfile);
    }
  }

  function openArchivedView() {
    activeFilter = 'arquivadas';
    tagButtons.forEach(b => {
      const match = b.dataset.filter === 'arquivadas';
      b.classList.toggle('active', match);
      b.setAttribute('aria-pressed', String(match));
    });
    applyFilter();
    list.scrollTop = 0;
  }

  function closeArchivedView() {
    activeFilter = 'todas';
    tagButtons.forEach(b => {
      const match = b.dataset.filter === 'todas';
      b.classList.toggle('active', match);
      b.setAttribute('aria-pressed', String(match));
    });
    applyFilter();
    list.scrollTop = 0;
  }

  archivedRow.addEventListener('click', () => openArchivedView());

  archivedRow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openArchivedView();
    }
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => closeArchivedView());
  }

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      tagButtons.forEach(b => b.classList.toggle('active', b === btn));
      tagButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      applyFilter();
      list.scrollTop = 0;
    });
  }

  searchInput.placeholder = 'Pesquisar mensagens';
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
    ['status', 'Atualizações', ICON_STATUS, onStatus],
    ['calls', 'Ligações', ICON_CALLS, onCalls],
    ['communities', 'Comunidades', ICON_COMMUNITIES, onCommunities],
    ['chats', 'Conversas', ICON_CHAT, onChats],
    ['vitrine', 'Vitrine', ICON_STORE, onVitrine],
    ['anunciar', 'Anunciar', ICON_ADVERTISE, onAnunciar],
  ]) {
    const tab = document.createElement('button');
    tab.className = 'sidebar-bottom-tab';
    tab.dataset.tab = key;
    tab.setAttribute('aria-label', label);
    tab.title = label;
    tab.innerHTML = `
      <span class="sidebar-bottom-tab-icon">${icon}</span>
      <span class="sidebar-bottom-tab-label">${label}</span>
    `;
    tab.querySelector('svg').setAttribute('aria-hidden', 'true');
    highlightNavigationShortcut(tab, key, { mobile: true });
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
    el.querySelectorAll('.calls-panel, .updates-panel, .communities-panel, .commercial-panel, .vitrine-panel, .agenda-panel').forEach(p => p.remove());
    el.insertBefore(panel, bottomNav);
    el.classList.add('sidebar--section');
    el.classList.toggle('sidebar--calls', kind === 'calls');
    el.classList.toggle('sidebar--communities', kind === 'communities');
    el.classList.toggle('sidebar--vitrine', kind === 'vitrine');
    el.classList.toggle('sidebar--anunciar', kind === 'anunciar');
    el.classList.toggle('sidebar--agenda', kind === 'agenda');
    selectTab(kind);
  };
  el.showCalls = panel => el.showSection('calls', panel);
  el.showCommunities = panel => el.showSection('communities', panel);
  el.showVitrine = panel => el.showSection('vitrine', panel);
  el.showAnunciar = panel => el.showSection('anunciar', panel);
  el.showCommercial = panel => el.showSection('anunciar', panel);
  el.showAgenda = panel => el.showSection('agenda', panel);
  el.showArchived = () => {
    el.classList.remove('sidebar--calls', 'sidebar--section', 'sidebar--communities', 'sidebar--vitrine', 'sidebar--anunciar', 'sidebar--commercial', 'sidebar--agenda');
    el.querySelectorAll('.calls-panel, .updates-panel, .communities-panel, .commercial-panel, .vitrine-panel, .agenda-panel').forEach(p => p.remove());
    selectTab('chats');
    openArchivedView();
  };
  el.showChats = () => {
    el.classList.remove('sidebar--calls', 'sidebar--section', 'sidebar--communities', 'sidebar--vitrine', 'sidebar--anunciar', 'sidebar--commercial', 'sidebar--agenda');
    el.querySelectorAll('.calls-panel, .updates-panel, .communities-panel, .commercial-panel, .vitrine-panel, .agenda-panel').forEach(p => p.remove());
    selectTab('chats');
  };
  el.closeArchived = () => {
    closeArchivedView();
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
      { label: 'Sobre o vorcarozap', action: onAbout, enabled: !!onAbout },
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
