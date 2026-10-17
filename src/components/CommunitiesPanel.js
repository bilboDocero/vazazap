/**
 * CommunitiesPanel component — renders the WhatsApp-style Communities tab in the sidebar.
 */

import {
  ICON_COMMUNITY_PEOPLE,
  ICON_PLUS_CIRCLE,
  ICON_MUTE,
  createNewCommunity,
} from '../lib/communities-content.js';
import { escapeHtml } from '../lib/utils.js';

export function renderCommunitiesPanel({ communities, selectedId, onSelect, onCreateCommunity }) {
  const panel = document.createElement('section');
  panel.className = 'communities-panel';
  panel.setAttribute('aria-label', 'Comunidades');

  panel.innerHTML = `
    <header class="communities-header">
      <h1 class="communities-title">Comunidades</h1>
      <button class="communities-header-btn" aria-label="Nova comunidade" title="Nova comunidade">
        ${ICON_PLUS_CIRCLE}
      </button>
    </header>

    <div class="communities-scroll-area">
      <div class="communities-new-card" role="button" tabindex="0" aria-label="Criar nova comunidade">
        <div class="communities-new-icon">
          <svg viewBox="0 0 44 44" width="44" height="44" fill="none">
            <rect width="44" height="44" rx="12" fill="#00A884"/>
            <g transform="translate(10, 10)" fill="#FFFFFF">
              <circle cx="12" cy="7" r="2.8"/>
              <circle cx="4.5" cy="9" r="2.2"/>
              <circle cx="19.5" cy="9" r="2.2"/>
              <path d="M6.5 19v-2.2c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3V19h-11ZM1 18v-2c0-2 1.6-3.4 3.8-3.4.8 0 1.5.2 2.1.5A6 6 0 0 0 4.5 18H1Zm18.5 0a6 6 0 0 0-2.4-4.9c.6-.3 1.3-.5 2.1-.5 2.2 0 3.8 1.4 3.8 3.4v2h-3.5Z"/>
            </g>
          </svg>
        </div>
        <span class="communities-new-label">Nova comunidade</span>
      </div>

      <div class="communities-list" role="list"></div>
    </div>
  `;

  const listEl = panel.querySelector('.communities-list');
  const expandedCommunities = new Set();

  function openCreateModal() {
    let modalEl = document.querySelector('.community-modal-overlay');
    if (modalEl) modalEl.remove();

    modalEl = document.createElement('div');
    modalEl.className = 'community-modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Criar uma nova comunidade');

    modalEl.innerHTML = `
      <div class="community-modal">
        <div class="community-modal-header">
          <h2>Criar uma nova comunidade</h2>
          <button class="community-modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="community-modal-body">
          <div class="community-modal-icon-picker">
            <div class="community-modal-avatar-preview">
              <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
                <rect width="64" height="64" rx="18" fill="#00A884"/>
                <g transform="translate(16, 16)" fill="#FFFFFF">
                  <circle cx="16" cy="10" r="4"/>
                  <circle cx="6" cy="13" r="3"/>
                  <circle cx="26" cy="13" r="3"/>
                  <path d="M9 26v-3c0-3.5 3.3-6 7-6s7 2.5 7 6v3h-14ZM1 25v-2.5c0-2.5 2-4.5 5-4.5 1 0 2 .3 2.8.8A7.8 7.8 0 0 0 7 24H1Zm30 0a7.8 7.8 0 0 0-1.8-5.2c.8-.5 1.8-.8 2.8-.8 3 0 5 2 5 4.5V25h-6Z"/>
                </g>
              </svg>
            </div>
            <p class="community-modal-hint">As comunidades reúnem seus grupos e facilitam o envio de avisos.</p>
          </div>
          <form class="community-modal-form">
            <label class="community-form-label">
              <span>Nome da comunidade</span>
              <input type="text" class="community-name-input" placeholder="Ex: ADF ou Novidades Dev" maxlength="60" required autofocus />
            </label>
            <label class="community-form-label">
              <span>Descrição da comunidade</span>
              <textarea class="community-desc-input" rows="3" placeholder="Do que se trata esta comunidade?"></textarea>
            </label>
            <div class="community-modal-actions">
              <button type="button" class="community-btn-cancel">Cancelar</button>
              <button type="submit" class="community-btn-submit">Criar comunidade</button>
            </div>
          </form>
        </div>
      </div>
    `;

    function closeModal() {
      modalEl.classList.remove('open');
      setTimeout(() => modalEl.remove(), 200);
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') closeModal();
    }

    modalEl.querySelector('.community-modal-close').addEventListener('click', closeModal);
    modalEl.querySelector('.community-btn-cancel').addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    const form = modalEl.querySelector('.community-modal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = modalEl.querySelector('.community-name-input');
      const descInput = modalEl.querySelector('.community-desc-input');
      const name = nameInput.value.trim();
      if (!name) return;

      const created = createNewCommunity({
        name,
        description: descInput.value.trim(),
      });
      closeModal();
      if (onCreateCommunity) onCreateCommunity(created);
    });

    document.body.appendChild(modalEl);
    document.addEventListener('keydown', handleKey);
    requestAnimationFrame(() => modalEl.classList.add('open'));
  }

  // Wire new community card & header plus button
  panel.querySelector('.communities-new-card').addEventListener('click', openCreateModal);
  panel.querySelector('.communities-new-card').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCreateModal();
    }
  });
  panel.querySelector('.communities-header-btn').addEventListener('click', openCreateModal);

  function renderList() {
    listEl.replaceChildren();

    communities.forEach((community) => {
      const card = document.createElement('div');
      card.className = 'community-card';
      card.dataset.communityId = community.id;

      // Header row for community
      const headerRow = document.createElement('div');
      headerRow.className = 'community-header-row';
      headerRow.dataset.id = community.id;
      headerRow.setAttribute('role', 'button');
      headerRow.setAttribute('tabindex', '0');
      headerRow.setAttribute('aria-label', `Comunidade ${community.name}`);

      headerRow.innerHTML = `
        <div class="community-avatar">${community.avatarSvg}</div>
        <span class="community-name">${escapeHtml(community.name)}</span>
      `;

      headerRow.addEventListener('click', () => {
        onSelect(community.id);
      });
      headerRow.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(community.id);
        }
      });

      card.appendChild(headerRow);

      // Groups list
      const groups = community.groups || [];
      const hasSubgroups = groups.length > 0;
      const isExpanded = expandedCommunities.has(community.id);

      if (hasSubgroups) {
        const groupsContainer = document.createElement('div');
        groupsContainer.className = 'community-groups';

        // For ADF and Rocketseat, initially show only the first group (Avisos),
        // or show all if expanded. For Teste, show 0 groups if not expanded.
        const isTeste = community.id === 'teste-community';
        let visibleGroups;
        if (isTeste) {
          visibleGroups = isExpanded ? groups : [];
        } else {
          visibleGroups = isExpanded ? groups : groups.slice(0, 1);
        }

        visibleGroups.forEach((group) => {
          const groupItem = document.createElement('div');
          groupItem.className = 'community-group-item';
          groupItem.dataset.id = group.id;
          groupItem.setAttribute('role', 'button');
          groupItem.setAttribute('tabindex', '0');
          groupItem.setAttribute('aria-label', `${group.name}: ${group.snippet}`);

          const unreadClass = group.unreadCount ? 'is-unread' : '';
          const unreadBadge = group.unreadCount
            ? `<span class="community-group-badge">${group.unreadCount}</span>`
            : '';
          const muteIcon = group.isMuted
            ? `<span class="community-group-mute" aria-label="Silenciado">${ICON_MUTE}</span>`
            : '';

          groupItem.innerHTML = `
            <div class="community-group-avatar">
              ${group.avatarSvg}
            </div>
            <div class="community-group-info">
              <div class="community-group-top">
                <span class="community-group-name">${escapeHtml(group.name)}</span>
                <span class="community-group-date ${unreadClass}">${escapeHtml(group.date || '')}</span>
              </div>
              <div class="community-group-bottom">
                <span class="community-group-snippet">${escapeHtml(group.snippet || '')}</span>
                <div class="community-group-meta">
                  ${muteIcon}
                  ${unreadBadge}
                </div>
              </div>
            </div>
          `;

          groupItem.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelect(group.id);
          });
          groupItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onSelect(group.id);
            }
          });

          groupsContainer.appendChild(groupItem);
        });

        card.appendChild(groupsContainer);

        // "Ver todos" button if community has multiple groups or if it's ADF / Rocketseat
        if (!isTeste || groups.length > 0) {
          if (!isTeste) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'community-toggle-groups';
            toggleBtn.type = 'button';
            toggleBtn.textContent = isExpanded ? 'Mostrar menos' : 'Ver todos';
            toggleBtn.setAttribute('aria-expanded', String(isExpanded));
            toggleBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (expandedCommunities.has(community.id)) {
                expandedCommunities.delete(community.id);
              } else {
                expandedCommunities.add(community.id);
              }
              renderList();
              onSelect(community.id);
            });
            card.appendChild(toggleBtn);
          }
        }
      }

      // Divider line
      const divider = document.createElement('div');
      divider.className = 'communities-divider';
      card.appendChild(divider);

      listEl.appendChild(card);
    });

    applyActive(selectedId);
  }

  function applyActive(id) {
    panel.querySelectorAll('.community-header-row').forEach((row) => {
      row.classList.toggle('active', row.dataset.id === id);
    });
    panel.querySelectorAll('.community-group-item').forEach((row) => {
      row.classList.toggle('active', row.dataset.id === id);
    });
  }

  panel.setActive = (id) => {
    selectedId = id;
    applyActive(id);
  };

  panel.openCreateModal = openCreateModal;

  panel.refresh = (newCommunities) => {
    communities = newCommunities;
    renderList();
  };

  renderList();
  return panel;
}
