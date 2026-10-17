import { ICON_SEARCH } from '../lib/icons.js';
import { ICON_STATUS, ICON_CHANNELS } from './NavRail.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { loadFollowedChannels, saveFollowedChannels } from '../lib/updates-content.js';
import {
  fetchPublishedStatuses,
  loadCachedStatuses,
  SOCIAL_NETWORKS,
} from '../lib/status-db.js';
import { openStatusPurchaseModal } from './StatusPurchaseModal.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_PLUS = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function avatar(entry, status = false, hasStory = false, isImpulsionado = false) {
  const el = document.createElement('span');
  const storyClasses = hasStory ? ` has-story${isImpulsionado ? ' is-impulsionado' : ''}` : '';
  el.className = `updates-avatar${status ? ' updates-avatar--status' : ''}${storyClasses}`;
  const pic = entry.avatar || entry.profile_pic;
  if (pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.innerHTML = defaultAvatarSvg(entry.id);
  }
  return el;
}

export function renderUpdatesPanel({ kind, entries, onSelect }) {
  const channels = kind === 'channels';
  const panel = document.createElement('section');
  panel.className = `updates-panel updates-panel--${kind}`;
  panel.setAttribute('aria-label', channels ? 'Canais do Vorcaro' : 'Status do Vorcaro');
  panel.innerHTML = `
    <header class="updates-header">
      <h1>${channels ? 'Canais' : 'Status'}</h1>
      <button class="updates-add" aria-label="${channels ? 'Criar canal' : 'Contratar status'}" title="${channels ? 'Publicação disponível futuramente' : 'Contratar e publicar novo status'}">${ICON_PLUS}</button>
    </header>
    ${channels ? `<label class="updates-search">${ICON_SEARCH}<input type="search" placeholder="Pesquisar" aria-label="Pesquisar canais" autocomplete="off"/></label>` : ''}
    <div class="updates-list"></div>
    <p class="updates-note">Simulação visual · imagens em tempo real</p>
  `;

  const addBtn = panel.querySelector('.updates-add');
  if (channels) {
    addBtn.disabled = true;
  } else {
    addBtn.disabled = false;
    addBtn.addEventListener('click', () => {
      openStatusPurchaseModal({
        onPublished: (pub) => {
          draw();
          onSelect(pub.id);
        },
      });
    });
  }

  const list = panel.querySelector('.updates-list');
  const followed = loadFollowedChannels();
  let expanded = false;
  let selected = null;

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
    open.setAttribute('aria-label', `${channels ? 'Abrir canal' : 'Ver status'} de ${entry.profile_name || entry.name}`);

    const isImp = entry.plan_type === 'status_impulsionado';
    const photo = avatar(entry, !channels && !self, isPurchased, isImp);

    if (!channels && self) {
      const plus = document.createElement('span');
      plus.className = 'updates-avatar-plus';
      plus.textContent = '+';
      photo.appendChild(plus);
    }
    open.appendChild(photo);

    const text = document.createElement('span');
    text.className = 'updates-row-text';

    const name = document.createElement('span');
    name.className = 'updates-row-name';

    if (!channels && self) {
      name.textContent = 'Meu status';
    } else if (isPurchased) {
      name.innerHTML = `${escapeHtml(entry.profile_name || entry.name)}${isImp ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}`;
    } else {
      name.textContent = entry.name;
    }

    const subtitle = document.createElement('span');
    subtitle.className = 'updates-row-subtitle';

    if (channels) {
      subtitle.textContent = 'Nenhuma publicação ainda';
    } else if (self) {
      subtitle.textContent = 'Daniel Vorcaro · sem atualizações';
    } else if (isPurchased) {
      subtitle.textContent = entry.user_handle || '@user';
    } else {
      subtitle.textContent = 'Nenhum status publicado';
    }

    text.append(name, subtitle);
    open.appendChild(text);
    open.addEventListener('click', () => onSelect(entry.id));
    wrap.appendChild(open);

    if (channels && !self) {
      const follow = document.createElement('button');
      follow.className = 'updates-follow';
      const isFollowing = followed.has(entry.id);
      follow.textContent = isFollowing ? 'Seguindo' : 'Seguir';
      follow.setAttribute('aria-label', `${isFollowing ? 'Deixar de seguir' : 'Seguir'} ${entry.name}`);
      follow.setAttribute('aria-pressed', String(isFollowing));
      follow.addEventListener('click', () => {
        if (followed.has(entry.id)) followed.delete(entry.id);
        else followed.add(entry.id);
        saveFollowedChannels(followed);
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
    const matching = entries.filter(entry => normalize(entry.name).includes(term));
    const own = matching.find(entry => entry.id === 'vorcaro');
    if (own) row(own, true);

    if (channels) {
      const following = matching.filter(entry => entry.id !== 'vorcaro' && followed.has(entry.id));
      if (following.length) {
        heading('Canais que você segue');
        following.forEach(entry => row(entry));
      }
      const suggestions = matching.filter(entry => entry.id !== 'vorcaro' && !followed.has(entry.id));
      if (suggestions.length) {
        heading('Encontrar canais para seguir');
        (expanded || term ? suggestions : suggestions.slice(0, 5)).forEach(entry => row(entry));
        if (!term && suggestions.length > 5) {
          const more = document.createElement('button');
          more.className = 'updates-discover';
          more.textContent = expanded ? 'Mostrar menos' : 'Descobrir mais';
          more.setAttribute('aria-expanded', String(expanded));
          more.addEventListener('click', () => { expanded = !expanded; draw(); list.querySelector('.updates-discover')?.focus(); });
          list.appendChild(more);
        }
      }
    } else {
      // Status mode: include purchased/published statuses from PostgreSQL / cache
      const cached = loadCachedStatuses();
      const filteredPurchased = cached.filter(p =>
        normalize(p.profile_name || '').includes(term) ||
        normalize(p.user_handle || '').includes(term)
      );

      if (filteredPurchased.length > 0) {
        heading('Atualizações recentes');
        filteredPurchased.forEach(pub => row(pub, false, true));
      }

      heading('Contatos · aguardando atualizações');
      matching.filter(entry => entry.id !== 'vorcaro').forEach(entry => row(entry));
    }

    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'updates-no-results';
      empty.setAttribute('role', 'status');
      empty.textContent = channels ? 'Nenhum canal encontrado.' : 'Nenhum status encontrado.';
      list.appendChild(empty);
    }
  }

  panel.querySelector('input')?.addEventListener('input', draw);
  panel.setActive = id => {
    selected = id;
    panel.querySelectorAll('.updates-row').forEach(row => row.classList.toggle('active', row.dataset.id === id));
  };

  window.addEventListener('status:published', () => {
    draw();
  });

  // Background sync with PostgreSQL
  if (!channels) {
    fetchPublishedStatuses().then(() => draw());
  }

  draw();
  return panel;
}

export function renderUpdatesDetail(container, { kind, entry, onBack, onConversation, onSelectStatus }) {
  const channels = kind === 'channels';

  // Check if entry is a purchased/published status with media files
  const isPurchasedStatus = entry && (entry.media_files || entry.social_network);

  if (isPurchasedStatus) {
    return renderStoryViewer(container, { entry, onBack, onSelectStatus });
  }

  const el = document.createElement('section');
  el.className = `updates-detail updates-detail--${kind}${entry ? ' has-selection' : ''}`;
  const header = document.createElement('header');
  header.className = 'updates-detail-header';
  const back = document.createElement('button');
  back.className = 'updates-back';
  back.setAttribute('aria-label', channels ? 'Voltar aos canais' : 'Voltar aos status');
  back.innerHTML = ICON_BACK;
  back.addEventListener('click', onBack);
  header.appendChild(back);
  if (entry) header.appendChild(avatar(entry));
  const title = document.createElement('span');
  title.textContent = entry?.name || (channels ? 'Canais do Vorcaro' : 'Status do Vorcaro');
  header.appendChild(title);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'updates-detail-body';
  const icon = document.createElement('div');
  icon.className = 'updates-detail-icon';
  icon.innerHTML = channels ? ICON_CHANNELS : ICON_STATUS;
  body.appendChild(icon);
  const badge = document.createElement('span');
  badge.className = 'updates-preview-label';
  badge.textContent = 'Simulação · em preparação';
  const heading = document.createElement('h2');
  heading.textContent = entry
    ? (channels ? 'Este canal ainda não tem publicações' : 'Nenhum status por enquanto')
    : (channels ? 'Um novo jeito de explorar o acervo' : 'Os momentos, em formato de status');
  const text = document.createElement('p');
  text.textContent = channels
    ? 'Aqui entrarão simulações com imagens públicas de Daniel Vorcaro e seus contatos. Siga os canais que deseja acompanhar.'
    : 'Aqui entrarão simulações de status com imagens públicas de Daniel Vorcaro e seus contatos.';
  body.append(badge, heading, text);

  if (entry?.conversationId) {
    const chat = document.createElement('button');
    chat.className = 'updates-open-conversation';
    chat.textContent = 'Ver histórico da conversa';
    chat.addEventListener('click', () => onConversation(entry.conversationId));
    body.appendChild(chat);
  }

  el.appendChild(body);
  container.replaceChildren(el);
  return el;
}

function renderStoryViewer(container, { entry, onBack, onSelectStatus }) {
  const publishedList = loadCachedStatuses();
  const currentClientIdx = publishedList.findIndex(item => item.id === entry.id);

  const nextClient = (currentClientIdx !== -1 && currentClientIdx < publishedList.length - 1)
    ? publishedList[currentClientIdx + 1]
    : null;
  const prevClient = (currentClientIdx > 0)
    ? publishedList[currentClientIdx - 1]
    : null;

  const mediaList = entry.media_files && entry.media_files.length > 0
    ? entry.media_files
    : [{ id: 'm1', name: 'Story', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', caption: entry.caption || '' }];

  let activeIdx = 0;
  let timerId = null;
  let isPaused = false;
  let remainingTime = 5000;
  let startTime = Date.now();
  const SLIDE_DURATION = 5000;

  const playerEl = document.createElement('section');
  playerEl.className = 'story-player';

  function exitViewer() {
    clearTimeout(timerId);
    onBack();
  }

  function goToNext() {
    if (activeIdx < mediaList.length - 1) {
      activeIdx++;
      drawStory();
    } else if (nextClient) {
      clearTimeout(timerId);
      if (onSelectStatus) {
        onSelectStatus(nextClient.id);
      } else {
        window.location.hash = `#/status/${nextClient.id}`;
      }
    } else {
      exitViewer();
    }
  }

  function goToPrev() {
    if (activeIdx > 0) {
      activeIdx--;
      drawStory();
    } else if (prevClient) {
      clearTimeout(timerId);
      if (onSelectStatus) {
        onSelectStatus(prevClient.id);
      } else {
        window.location.hash = `#/status/${prevClient.id}`;
      }
    }
  }

  function startTimer(duration = SLIDE_DURATION) {
    clearTimeout(timerId);
    remainingTime = duration;
    startTime = Date.now();
    isPaused = false;
    playerEl.classList.remove('is-paused');

    timerId = setTimeout(() => {
      goToNext();
    }, duration);
  }

  function pauseTimer() {
    if (isPaused) return;
    isPaused = true;
    clearTimeout(timerId);
    const elapsed = Date.now() - startTime;
    remainingTime = Math.max(500, remainingTime - elapsed);
    playerEl.classList.add('is-paused');
  }

  function resumeTimer() {
    if (!isPaused) return;
    startTimer(remainingTime);
  }

  function drawStory() {
    startTimer(SLIDE_DURATION);
    const currentMedia = mediaList[activeIdx] || mediaList[0];
    const net = SOCIAL_NETWORKS[entry.social_network] || SOCIAL_NETWORKS.instagram;
    const slideCaption = currentMedia.caption || entry.caption || '';

    const hasPrev = activeIdx > 0 || prevClient !== null;
    const hasNext = activeIdx < mediaList.length - 1 || nextClient !== null;

    playerEl.innerHTML = `
      <div class="story-progress-bar">
        ${mediaList.map((m, idx) => `
          <div class="story-progress-seg ${idx === activeIdx ? 'active' : (idx < activeIdx ? 'passed' : '')}"></div>
        `).join('')}
      </div>

      <header class="story-header">
        <div class="story-header-user">
          <div class="story-header-avatar">
            ${entry.profile_pic
              ? `<img src="${entry.profile_pic}" alt="${escapeHtml(entry.profile_name)}" />`
              : defaultAvatarSvg(entry.id)
            }
          </div>
          <div>
            <div class="story-header-name">
              ${escapeHtml(entry.profile_name)}
              ${entry.plan_type === 'status_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
            </div>
            <div class="story-header-meta">${escapeHtml(entry.user_handle)} · ${net.name}</div>
          </div>
        </div>
        <button type="button" class="story-close-btn" aria-label="Fechar status">&times;</button>
      </header>

      <div class="story-media-box">
        <img src="${currentMedia.url}" alt="${escapeHtml(currentMedia.name)}" class="story-media-image" />

        <button type="button" class="story-nav-btn prev" aria-label="Mídia anterior" ${hasPrev ? '' : 'style="display:none;"'}>&#10094;</button>
        <button type="button" class="story-nav-btn next" aria-label="Próxima mídia" ${hasNext ? '' : 'style="display:none;"'}>&#10095;</button>
      </div>

      <footer class="story-footer">
        ${slideCaption ? `
          <div class="story-caption-box">
            <p class="story-caption-text">${escapeHtml(slideCaption)}</p>
          </div>
        ` : ''}

        <a href="${entry.social_link}" target="_blank" rel="noopener noreferrer" class="story-social-btn" style="background: ${net.color};">
          ${net.icon}
          <span>Visitar perfil no ${net.name} (${escapeHtml(entry.user_handle)}) ↗</span>
        </a>

        <button type="button" class="story-publish-more-btn">
          + Contratar e publicar outro status
        </button>
      </footer>
    `;

    playerEl.querySelector('.story-close-btn')?.addEventListener('click', exitViewer);

    const mediaBox = playerEl.querySelector('.story-media-box');
    mediaBox?.addEventListener('pointerdown', pauseTimer);
    mediaBox?.addEventListener('pointerup', resumeTimer);
    mediaBox?.addEventListener('pointercancel', resumeTimer);
    mediaBox?.addEventListener('pointerleave', resumeTimer);

    playerEl.querySelector('.story-nav-btn.prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goToPrev();
    });

    playerEl.querySelector('.story-nav-btn.next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goToNext();
    });

    playerEl.querySelector('.story-publish-more-btn')?.addEventListener('click', () => {
      clearTimeout(timerId);
      openStatusPurchaseModal({
        onPublished: (pub) => {
          window.location.hash = `#/status/${pub.id}`;
        },
      });
    });
  }

  drawStory();
  container.replaceChildren(playerEl);
  return playerEl;
}
