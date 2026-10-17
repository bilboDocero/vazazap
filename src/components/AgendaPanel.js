/**
 * AgendaPanel component — renders the "Nova conversa / Agenda" sidebar panel,
 * displaying the contacts seized by the Federal Police and published by Folha de S.Paulo.
 */

import { ICON_SEARCH } from '../lib/icons.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { AGENDA_CONTACTS, AGENDA_CATEGORIES } from '../lib/agenda-content.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function contactAvatar(contact) {
  const el = document.createElement('span');
  el.className = 'agenda-item-avatar';
  if (contact.avatar) {
    const img = document.createElement('img');
    img.src = contact.avatar;
    img.alt = contact.name;
    el.appendChild(img);
  } else {
    el.innerHTML = defaultAvatarSvg(contact.name || contact.id, 44);
  }
  return el;
}

export function renderAgendaPanel({ selectedId = null, onSelect, onOpenConversation, onBack }) {
  const panel = document.createElement('section');
  panel.className = 'agenda-panel';
  panel.setAttribute('aria-label', 'Agenda telefônica de Daniel Vorcaro');

  panel.innerHTML = `
    <header class="agenda-header">
      <button class="agenda-back-btn" aria-label="Voltar às conversas" title="Voltar às conversas">
        ${ICON_BACK}
      </button>
      <div class="agenda-header-titles">
        <h1 class="agenda-title">Nova conversa</h1>
        <span class="agenda-header-subtitle">Agenda telefônica apreendida</span>
      </div>
    </header>

    <label class="updates-search agenda-search">
      ${ICON_SEARCH}
      <input type="search" placeholder="Pesquisar contatos da agenda" aria-label="Pesquisar contatos" autocomplete="off" />
    </label>

    <div class="agenda-category-filter" role="tablist" aria-label="Filtrar por categoria">
      ${AGENDA_CATEGORIES.map((cat, idx) => `
        <button type="button" class="agenda-cat-btn ${idx === 0 ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
          ${escapeHtml(cat)}
        </button>
      `).join('')}
    </div>

    <div class="agenda-meta-tally">
      <span class="agenda-tally-count">${AGENDA_CONTACTS.length} contatos divulgados pela Folha</span>
    </div>

    <div class="agenda-list" role="list"></div>
  `;

  const listEl = panel.querySelector('.agenda-list');
  const searchInput = panel.querySelector('input');
  let activeCat = 'Todos';
  let currentSelected = selectedId;

  panel.querySelector('.agenda-back-btn').addEventListener('click', onBack);

  panel.querySelectorAll('.agenda-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.agenda-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
      activeCat = btn.dataset.cat;
      draw();
    });
  });

  searchInput.addEventListener('input', draw);

  function draw() {
    listEl.replaceChildren();
    const query = normalize(searchInput.value.trim());

    const filtered = AGENDA_CONTACTS.filter(contact => {
      const matchCat = activeCat === 'Todos' || contact.category === activeCat;
      const matchQuery = !query ||
        normalize(contact.name).includes(query) ||
        normalize(contact.role).includes(query) ||
        normalize(contact.savedAs || '').includes(query);
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'agenda-empty-msg';
      empty.textContent = 'Nenhum contato encontrado com este filtro.';
      listEl.appendChild(empty);
      return;
    }

    // Sort alphabetically by name
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    let lastLetter = '';
    sorted.forEach((contact) => {
      const firstLetter = normalize(contact.name).charAt(0).toUpperCase();
      if (!query && firstLetter !== lastLetter && /[A-Z]/.test(firstLetter)) {
        lastLetter = firstLetter;
        const letterHeader = document.createElement('div');
        letterHeader.className = 'agenda-letter-divider';
        letterHeader.textContent = firstLetter;
        listEl.appendChild(letterHeader);
      }

      const item = document.createElement('div');
      item.className = 'agenda-contact-row';
      item.dataset.id = contact.id;
      item.classList.toggle('active', contact.id === currentSelected);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${contact.name} - ${contact.role}`);

      item.appendChild(contactAvatar(contact));

      const info = document.createElement('div');
      info.className = 'agenda-contact-info';

      const nameRow = document.createElement('div');
      nameRow.className = 'agenda-name-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'agenda-contact-name';
      nameEl.textContent = contact.name;
      nameRow.appendChild(nameEl);

      if (contact.hasConversation) {
        const badge = document.createElement('span');
        badge.className = 'agenda-chat-badge';
        badge.title = 'Existe conversa vazada no acervo';
        badge.textContent = 'Conversa no acervo';
        nameRow.appendChild(badge);
      }

      const roleEl = document.createElement('span');
      roleEl.className = 'agenda-contact-role';
      roleEl.textContent = contact.role;

      info.append(nameRow, roleEl);
      item.appendChild(info);

      const clickAction = () => {
        currentSelected = contact.id;
        panel.querySelectorAll('.agenda-contact-row').forEach(r => {
          r.classList.toggle('active', r.dataset.id === contact.id);
        });

        if (contact.hasConversation && contact.conversationId) {
          if (onOpenConversation) onOpenConversation(contact.conversationId);
        } else {
          if (onSelect) onSelect(contact.id);
        }
      };

      item.addEventListener('click', clickAction);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clickAction();
        }
      });

      listEl.appendChild(item);
    });
  }

  panel.setActive = (id) => {
    currentSelected = id;
    panel.querySelectorAll('.agenda-contact-row').forEach(r => {
      r.classList.toggle('active', r.dataset.id === id);
    });
  };

  draw();
  return panel;
}
