/**
 * VitrinePanel component — sidebar panel for Vitrine, similar to Canais tab (UpdatesPanel),
 * displaying published vitrines with PostgreSQL integration and purchase modal.
 */

import { ICON_SEARCH } from '../lib/icons.js';
import { ICON_STORE, loadFollowedVitrines, saveFollowedVitrines } from '../lib/commercial-content.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import {
  fetchPublishedVitrines,
  loadCachedVitrines,
} from '../lib/vitrine-db.js';
import { openVitrinePurchaseModal } from './VitrinePurchaseModal.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_PLUS = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function vitrineAvatar(entry, self = false, isPurchased = false) {
  const el = document.createElement('span');
  const isImp = entry.plan_type === 'vitrine_impulsionado';
  const storyClasses = isPurchased ? ` updates-avatar--status has-story${isImp ? ' is-impulsionado' : ''}` : '';
  el.className = `updates-avatar vitrine-avatar${storyClasses}`;
  const pic = entry.avatar || entry.profile_pic;
  if (pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.innerHTML = defaultAvatarSvg(entry.id);
  }
  if (self) {
    const iconOverlay = document.createElement('span');
    iconOverlay.className = 'vitrine-avatar-store-badge';
    iconOverlay.innerHTML = ICON_STORE;
    el.appendChild(iconOverlay);
  }
  return el;
}

export function renderVitrinePanel({ vitrines, selectedId, onSelect }) {
  const panel = document.createElement('section');
  panel.className = 'updates-panel vitrine-panel';
  panel.setAttribute('aria-label', 'Vitrines e Catálogos Comerciais');

  panel.innerHTML = `
    <header class="updates-header">
      <h1>Vitrine</h1>
      <button class="updates-add" aria-label="Contratar vitrine" title="Contratar e publicar na vitrine">${ICON_PLUS}</button>
    </header>
    <label class="updates-search">${ICON_SEARCH}<input type="search" placeholder="Pesquisar vitrines e produtos" aria-label="Pesquisar vitrines" autocomplete="off"/></label>
    <div class="updates-list"></div>
    <p class="updates-note">Vitrine interativa · catálogos e produtos integrados</p>
  `;

  const list = panel.querySelector('.updates-list');
  const followed = loadFollowedVitrines();
  let expanded = false;
  let selected = selectedId || null;

  panel.querySelector('.updates-add').addEventListener('click', () => {
    openVitrinePurchaseModal({
      onPublished: (pub) => {
        draw();
        onSelect(pub.id);
      },
    });
  });

  function heading(text) {
    const el = document.createElement('h2');
    el.className = 'updates-section-title';
    el.textContent = text;
    list.appendChild(el);
  }

  function row(entry, self = false, isPurchased = false) {
    const wrap = document.createElement('div');
    wrap.className = 'updates-row';
    wrap.dataset.id = entry.id;
    wrap.classList.toggle('active', entry.id === selected);

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'updates-open';
    open.setAttribute('aria-label', `Abrir vitrine de ${entry.profile_name || entry.name}`);

    const isImp = entry.plan_type === 'vitrine_impulsionado';
    const photo = vitrineAvatar(entry, self, isPurchased);
    open.appendChild(photo);

    const text = document.createElement('span');
    text.className = 'updates-row-text';

    const name = document.createElement('span');
    name.className = 'updates-row-name';

    if (isPurchased) {
      name.innerHTML = `${escapeHtml(entry.profile_name || entry.name)}${isImp ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}`;
    } else {
      name.textContent = entry.name;
    }

    const subtitle = document.createElement('span');
    subtitle.className = 'updates-row-subtitle';
    if (isPurchased) {
      subtitle.textContent = entry.user_handle || '@vitrine';
    } else {
      subtitle.textContent = entry.subtitle || (self ? 'Sua vitrine comercial' : 'Produtos disponíveis');
    }

    text.append(name, subtitle);
    open.appendChild(text);

    open.addEventListener('click', () => {
      selected = entry.id;
      panel.querySelectorAll('.updates-row').forEach(r => r.classList.toggle('active', r.dataset.id === entry.id));
      onSelect(entry.id);
    });

    wrap.appendChild(open);

    if (!self && !isPurchased) {
      const follow = document.createElement('button');
      follow.className = 'updates-follow';
      const isFollowing = followed.has(entry.id);
      follow.textContent = isFollowing ? 'Seguindo' : 'Seguir';
      follow.setAttribute('aria-label', `${isFollowing ? 'Deixar de seguir' : 'Seguir'} ${entry.name}`);
      follow.setAttribute('aria-pressed', String(isFollowing));

      follow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (followed.has(entry.id)) followed.delete(entry.id);
        else followed.add(entry.id);
        saveFollowedVitrines(followed);
        draw();
        list.querySelector(`[data-id="${entry.id}"] .updates-follow`)?.focus();
      });

      wrap.appendChild(follow);
    }

    list.appendChild(wrap);
  }

  function draw() {
    list.replaceChildren();
    const term = normalize(panel.querySelector('input')?.value.trim() || '');
    const matching = vitrines.filter(entry =>
      normalize(entry.name).includes(term) ||
      normalize(entry.subtitle || '').includes(term) ||
      (entry.products || []).some(p => normalize(p.name).includes(term) || normalize(p.description).includes(term))
    );

    const own = matching.find(entry => entry.id === 'vorcaro-vitrine');
    if (own) {
      heading('Sua vitrine');
      row(own, true);
    }

    // Published vitrines from PostgreSQL / cache
    const cached = loadCachedVitrines();
    const filteredPurchased = cached.filter(p =>
      normalize(p.profile_name || '').includes(term) ||
      normalize(p.user_handle || '').includes(term)
    );

    if (filteredPurchased.length > 0) {
      heading('Vitrines recentes e patrocinadas');
      filteredPurchased.forEach(pub => row(pub, false, true));
    }

    const following = matching.filter(entry => entry.id !== 'vorcaro-vitrine' && followed.has(entry.id));
    if (following.length) {
      heading('Vitrines que você segue');
      following.forEach(entry => row(entry));
    }

    const suggestions = matching.filter(entry => entry.id !== 'vorcaro-vitrine' && !followed.has(entry.id));
    if (suggestions.length) {
      heading('Explorar vitrines');
      const displayed = expanded || term ? suggestions : suggestions.slice(0, 4);
      displayed.forEach(entry => row(entry));

      if (!term && suggestions.length > 4) {
        const more = document.createElement('button');
        more.className = 'updates-discover';
        more.textContent = expanded ? 'Mostrar menos' : 'Descobrir mais vitrines';
        more.setAttribute('aria-expanded', String(expanded));
        more.addEventListener('click', () => {
          expanded = !expanded;
          draw();
          list.querySelector('.updates-discover')?.focus();
        });
        list.appendChild(more);
      }
    }

    if (!matching.length && !filteredPurchased.length) {
      const empty = document.createElement('p');
      empty.className = 'updates-no-results';
      empty.setAttribute('role', 'status');
      empty.textContent = 'Nenhuma vitrine ou produto encontrado.';
      list.appendChild(empty);
    }
  }

  panel.querySelector('input')?.addEventListener('input', draw);

  panel.setActive = (id) => {
    selected = id;
    panel.querySelectorAll('.updates-row').forEach(row => row.classList.toggle('active', row.dataset.id === id));
  };

  window.addEventListener('vitrine:published', () => {
    draw();
  });

  // Background sync with PostgreSQL
  fetchPublishedVitrines().then(() => draw());

  draw();
  return panel;
}
