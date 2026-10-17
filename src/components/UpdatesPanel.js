import { ICON_SEARCH } from '../lib/icons.js';
import { ICON_STATUS, ICON_CHANNELS } from './NavRail.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { loadFollowedChannels, saveFollowedChannels } from '../lib/updates-content.js';
import {
  fetchPublishedStatuses,
  loadCachedStatuses,
  sortStatusesForClient,
  getMyLastPurchasedStatusId,
  SOCIAL_NETWORKS,
} from '../lib/status-db.js';
import { openStatusPurchaseModal } from './StatusPurchaseModal.js';
import { escapeHtml, sanitizeUrl, escapeAttr } from '../lib/utils.js';

const ICON_PLUS = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const ICON_CAMERA_ACTION = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>';
const ICON_PENCIL_ACTION = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
const ICON_CAM_SNIPPET = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:-1px; margin-right:3px;"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>';

const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function avatar(entry, status = false, hasStory = false, isImpulsionado = false) {
  const el = document.createElement('span');
  const storyClasses = hasStory ? ` has-story${isImpulsionado ? ' is-impulsionado' : ''}` : '';
  el.className = `updates-avatar${status ? ' updates-avatar--status' : ''}${storyClasses}`;
  const pic = entry?.avatar || entry?.profile_pic;
  if (pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.innerHTML = defaultAvatarSvg(entry?.id || 'default');
  }
  return el;
}

export function renderUpdatesPanel(options = {}) {
  const {
    kind = 'status',
    entries = [],
    statusEntries = (kind === 'status' ? entries : []) || [],
    channelEntries = (kind === 'channels' ? entries : []) || [],
    catalog,
    onSelect,
    onSelectStatus = onSelect,
    onSelectChannel = onSelect,
  } = options;

  const resolvedStatusEntries = catalog?.status || statusEntries || [];
  const resolvedChannelEntries = catalog?.channels || channelEntries || [];

  const panel = document.createElement('section');
  panel.className = 'updates-panel updates-panel--status';
  panel.setAttribute('aria-label', 'Atualizações: Status e Canais');

  panel.innerHTML = `
    <header class="updates-header">
      <div class="updates-header-left">
        <h1>Atualizações</h1>
      </div>
      <div class="updates-header-actions">
        <button type="button" class="updates-add" aria-label="Adicionar status" title="Contratar e publicar novo status">${ICON_PLUS}</button>
      </div>
    </header>

    <label class="updates-search">
      ${ICON_SEARCH}
      <input type="search" placeholder="Pesquisar" aria-label="Pesquisar atualizações" autocomplete="off"/>
    </label>

    <div class="updates-content-scroll">
      <!-- ── SECTION: STATUS ─────────────────────────── -->
      <section class="updates-status-section">
        <div class="updates-section-header">
          <h2 class="updates-section-title">Status</h2>
          <div class="updates-status-actions">
            <button type="button" class="updates-status-icon-btn btn-status-camera" aria-label="Adicionar status com foto" title="Adicionar status com foto">${ICON_CAMERA_ACTION}</button>
            <button type="button" class="updates-status-icon-btn btn-status-pencil" aria-label="Escrever status" title="Escrever status">${ICON_PENCIL_ACTION}</button>
          </div>
        </div>

        <div class="updates-status-carousel" role="region" aria-label="Atualizações de status em carrossel horizontal">
          <!-- Horizontal cards rendered dynamically by drawStatusCards() -->
        </div>
      </section>

      <!-- ── SECTION: CANAIS ─────────────────────────── -->
      <section class="updates-channels-section">
        <div class="updates-section-header">
          <h2 class="updates-section-title">Canais</h2>
          <button type="button" class="updates-discover-pill">Descobrir</button>
        </div>

        <div class="updates-channels-list">
          <!-- Vertical channel rows rendered dynamically by drawChannelsList() -->
        </div>
      </section>

      <p class="updates-note">Simulação visual · imagens e canais em tempo real</p>
    </div>
  `;

  // Status creation triggers
  function triggerCreateStatus() {
    openStatusPurchaseModal({
      onPublished: (pub) => {
        draw();
        onSelectStatus?.(pub.id);
      },
    });
  }

  panel.querySelector('.updates-add')?.addEventListener('click', triggerCreateStatus);
  panel.querySelector('.btn-status-camera')?.addEventListener('click', triggerCreateStatus);
  panel.querySelector('.btn-status-pencil')?.addEventListener('click', triggerCreateStatus);

  const searchInput = panel.querySelector('.updates-search input');
  const carouselContainer = panel.querySelector('.updates-status-carousel');
  const channelsListContainer = panel.querySelector('.updates-channels-list');
  const followed = loadFollowedChannels();
  let selectedId = null;
  let showAllChannels = false;

  panel.querySelector('.updates-discover-pill')?.addEventListener('click', () => {
    showAllChannels = !showAllChannels;
    drawChannelsList();
  });

  function drawStatusCards() {
    carouselContainer.replaceChildren();
    const query = normalize(searchInput?.value.trim());

    // 1. First card: "Adicionar status" (Daniel Vorcaro)
    const addCard = document.createElement('div');
    addCard.className = 'status-card status-card--add';
    addCard.setAttribute('role', 'button');
    addCard.setAttribute('tabindex', '0');
    addCard.setAttribute('aria-label', 'Adicionar status');
    addCard.innerHTML = `
      <div class="status-card-add-avatar-wrap">
        <img src="/assets/avatar-dv.jpg" alt="Daniel Vorcaro" class="status-card-add-avatar" />
        <span class="status-card-add-badge">+</span>
      </div>
      <span class="status-card-add-label">Adicionar<br/>status</span>
    `;
    addCard.addEventListener('click', triggerCreateStatus);
    carouselContainer.appendChild(addCard);

    // 2. ONLY advertiser/purchased statuses recovered from the database / cache
    const published = loadCachedStatuses();
    const myLastId = getMyLastPurchasedStatusId();
    const clientSorted = sortStatusesForClient(published, myLastId);

    const filteredPublished = clientSorted.filter(p =>
      !query ||
      normalize(p.profile_name).includes(query) ||
      normalize(p.user_handle).includes(query)
    );

    filteredPublished.forEach(pub => {
      const isMyStatus = pub.id === myLastId;
      const isImp = pub.plan_type === 'status_impulsionado';
      const card = document.createElement('div');
      card.className = `status-card status-card--story${pub.id === selectedId ? ' active' : ''}${isMyStatus ? ' is-my-status' : ''}`;
      card.dataset.id = pub.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${isMyStatus ? 'Seu status: ' : ''}Ver status de ${pub.profile_name || 'Usuário'}`);

      const mediaUrl = (pub.media_files && pub.media_files[0]?.url)
        || pub.profile_pic
        || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80';

      const avatarMarkup = pub.profile_pic
        ? `<img src="${sanitizeUrl(pub.profile_pic, true)}" alt="" />`
        : defaultAvatarSvg(pub.id, 34);

      let badgeMarkup = '';
      if (isMyStatus) {
        badgeMarkup = '<span class="status-card-boost-badge status-card-my-badge">VOCÊ</span>';
      } else if (isImp) {
        badgeMarkup = '<span class="status-card-boost-badge">PRO</span>';
      }

      card.innerHTML = `
        <img src="${sanitizeUrl(mediaUrl, true)}" alt="" class="status-card-bg" />
        <div class="status-card-overlay"></div>
        <div class="status-card-avatar ${isImp || isMyStatus ? 'is-impulsionado' : ''}">
          ${avatarMarkup}
        </div>
        ${badgeMarkup}
        <span class="status-card-name">${escapeHtml(pub.profile_name || pub.user_handle || 'Status')}</span>
      `;

      card.addEventListener('click', () => {
        panel.setActive(pub.id);
        onSelectStatus?.(pub.id);
      });
      carouselContainer.appendChild(card);
    });

    // If there are no published statuses yet, display a prompt card
    if (filteredPublished.length === 0 && !query) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'status-card status-card--empty-prompt';
      emptyCard.setAttribute('role', 'button');
      emptyCard.setAttribute('tabindex', '0');
      emptyCard.setAttribute('aria-label', 'Anuncie seu Status aqui');
      emptyCard.innerHTML = `
        <div class="status-card-empty-icon">${ICON_CAMERA_ACTION}</div>
        <span class="status-card-empty-title">Anuncie seu Status</span>
        <span class="status-card-empty-desc">Toque para publicar</span>
      `;
      emptyCard.addEventListener('click', triggerCreateStatus);
      carouselContainer.appendChild(emptyCard);
    }
  }

  function drawChannelsList() {
    channelsListContainer.replaceChildren();
    const query = normalize(searchInput?.value.trim());

    const matching = resolvedChannelEntries.filter(entry =>
      !query || normalize(entry.name).includes(query) || normalize(entry.description).includes(query)
    );

    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'updates-no-results';
      empty.textContent = 'Nenhum canal encontrado.';
      channelsListContainer.appendChild(empty);
      return;
    }

    // Followed channels first
    const following = matching.filter(c => followed.has(c.id));
    if (following.length > 0) {
      const header = document.createElement('div');
      header.className = 'updates-channel-subheading';
      header.textContent = 'Canais que você segue';
      channelsListContainer.appendChild(header);

      following.forEach(channel => renderChannelRow(channel, true));
    }

    // Suggested channels
    const suggestions = matching.filter(c => !followed.has(c.id));
    if (suggestions.length > 0) {
      const header = document.createElement('div');
      header.className = 'updates-channel-subheading';
      header.textContent = 'Encontrar canais para seguir';
      channelsListContainer.appendChild(header);

      const itemsToShow = (showAllChannels || query) ? suggestions : suggestions.slice(0, 6);
      itemsToShow.forEach(channel => renderChannelRow(channel, false));

      if (!query && suggestions.length > 6) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'updates-discover';
        toggleBtn.textContent = showAllChannels ? 'Mostrar menos' : 'Descobrir mais canais';
        toggleBtn.addEventListener('click', () => {
          showAllChannels = !showAllChannels;
          drawChannelsList();
        });
        channelsListContainer.appendChild(toggleBtn);
      }
    }
  }

  function renderChannelRow(channel, isFollowing) {
    const row = document.createElement('div');
    row.className = `updates-channel-row${channel.id === selectedId ? ' active' : ''}`;
    row.dataset.id = channel.id;

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'updates-channel-avatar';
    if (channel.avatar) {
      const img = document.createElement('img');
      img.src = channel.avatar;
      img.alt = '';
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.innerHTML = defaultAvatarSvg(channel.id, 48);
    }

    const info = document.createElement('div');
    info.className = 'updates-channel-info';

    const topLine = document.createElement('div');
    topLine.className = 'updates-channel-top-line';

    const name = document.createElement('span');
    name.className = 'updates-channel-name';
    name.textContent = channel.name;

    const date = document.createElement('span');
    date.className = 'updates-channel-date';
    date.textContent = '31/07/2026';

    topLine.append(name, date);

    const bottomLine = document.createElement('div');
    bottomLine.className = 'updates-channel-bottom-line';

    const snippet = document.createElement('span');
    snippet.className = 'updates-channel-snippet';
    snippet.innerHTML = `${ICON_CAM_SNIPPET} ${escapeHtml(channel.description || 'Publicações e atualizações do canal')}`;

    bottomLine.appendChild(snippet);
    info.append(topLine, bottomLine);

    const followBtn = document.createElement('button');
    followBtn.type = 'button';
    followBtn.className = 'updates-channel-follow-btn';
    followBtn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
    followBtn.setAttribute('aria-pressed', String(isFollowing));
    followBtn.setAttribute('aria-label', `${isFollowing ? 'Deixar de seguir' : 'Seguir'} ${channel.name}`);

    followBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (followed.has(channel.id)) followed.delete(channel.id);
      else followed.add(channel.id);
      saveFollowedChannels(followed);
      drawChannelsList();
    });

    row.append(avatarWrap, info, followBtn);

    row.addEventListener('click', () => {
      panel.setActive(channel.id);
      onSelectChannel?.(channel.id);
    });

    channelsListContainer.appendChild(row);
  }

  function draw() {
    drawStatusCards();
    drawChannelsList();
  }

  searchInput?.addEventListener('input', draw);

  panel.setActive = id => {
    selectedId = id;
    panel.querySelectorAll('.status-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    panel.querySelectorAll('.updates-channel-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
  };

  window.addEventListener('status:published', draw);
  window.addEventListener('status:cache-updated', draw);

  // Background fetch
  fetchPublishedStatuses().then(() => draw());

  draw();
  return panel;
}

export function renderUpdatesDetail(container, { kind = 'status', entry, onBack, onConversation, onSelectStatus }) {
  // Check if entry is a purchased/published status with media files or caption
  const isPurchasedStatus = entry && (entry.media_files || entry.social_network || entry.plan_type?.includes('status'));

  if (isPurchasedStatus) {
    return renderStoryViewer(container, { entry, onBack, onSelectStatus });
  }

  const isChannel = kind === 'channels' || entry?.description || entry?.name?.includes('Canal') || entry?.name?.includes('Vorcaro e ');

  const el = document.createElement('section');
  el.className = `updates-detail updates-detail--${isChannel ? 'channels' : 'status'}${entry ? ' has-selection' : ''}`;

  const header = document.createElement('header');
  header.className = 'updates-detail-header';

  const back = document.createElement('button');
  back.className = 'updates-back';
  back.setAttribute('aria-label', 'Voltar');
  back.innerHTML = ICON_BACK;
  back.addEventListener('click', onBack);
  header.appendChild(back);

  if (entry) header.appendChild(avatar(entry));

  const title = document.createElement('span');
  title.textContent = entry?.name || (isChannel ? 'Canal do Vorcaro' : 'Status do Vorcaro');
  header.appendChild(title);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'updates-detail-body';

  const icon = document.createElement('div');
  icon.className = 'updates-detail-icon';
  icon.innerHTML = isChannel ? ICON_CHANNELS : ICON_STATUS;
  body.appendChild(icon);

  const badge = document.createElement('span');
  badge.className = 'updates-preview-label';
  badge.textContent = isChannel ? 'Canal Oficial' : 'Status';

  const heading = document.createElement('h2');
  heading.textContent = entry
    ? (isChannel ? entry.name : 'Status de ' + entry.name)
    : 'Atualizações e Canais';

  const text = document.createElement('p');
  text.textContent = isChannel
    ? (entry?.description || 'Canal de notícias e publicações públicas.')
    : 'Simulação de status com imagens e momentos dos contatos no acervo.';

  body.append(badge, heading, text);

  if (entry?.conversationId) {
    const chat = document.createElement('button');
    chat.className = 'updates-open-conversation';
    chat.textContent = 'Ver histórico da conversa';
    chat.addEventListener('click', () => onConversation?.(entry.conversationId));
    body.appendChild(chat);
  }

  el.appendChild(body);
  container.replaceChildren(el);
  return el;
}

function renderStoryViewer(container, { entry, onBack, onSelectStatus }) {
  const publishedList = sortStatusesForClient(loadCachedStatuses());
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
              ? `<img src="${sanitizeUrl(entry.profile_pic, true)}" alt="${escapeHtml(entry.profile_name)}" />`
              : defaultAvatarSvg(entry.id)
            }
          </div>
          <div>
            <div class="story-header-name">
              ${escapeHtml(entry.profile_name)}
              ${entry.plan_type === 'status_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
            </div>
            <div class="story-header-meta">${escapeHtml(entry.user_handle)} · ${escapeHtml(net.name)}</div>
          </div>
        </div>
        <button type="button" class="story-close-btn" aria-label="Fechar status">&times;</button>
      </header>

      <div class="story-media-box">
        <img src="${sanitizeUrl(currentMedia.url, true)}" alt="${escapeHtml(currentMedia.name)}" class="story-media-image" />

        <button type="button" class="story-nav-btn prev" aria-label="Mídia anterior" ${hasPrev ? '' : 'style="display:none;"'}>&#10094;</button>
        <button type="button" class="story-nav-btn next" aria-label="Próxima mídia" ${hasNext ? '' : 'style="display:none;"'}>&#10095;</button>
      </div>

      <footer class="story-footer">
        ${slideCaption ? `
          <div class="story-caption-box">
            <p class="story-caption-text">${escapeHtml(slideCaption)}</p>
          </div>
        ` : ''}

        <a href="${sanitizeUrl(entry.social_link)}" target="_blank" rel="noopener noreferrer" class="story-social-btn" style="background: ${escapeAttr(net.color)};">
          ${net.icon}
          <span>Visitar perfil no ${escapeHtml(net.name)} (${escapeHtml(entry.user_handle)}) ↗</span>
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

    playerEl.querySelector('.story-nav-btn.prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goToPrev();
    });

    playerEl.querySelector('.story-nav-btn.next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goToNext();
    });

    playerEl.querySelector('.story-publish-more-btn')?.addEventListener('click', () => {
      exitViewer();
      openStatusPurchaseModal({
        onPublished: (pub) => {
          if (onSelectStatus) {
            onSelectStatus(pub.id);
          } else {
            window.location.hash = `#/status/${pub.id}`;
          }
        },
      });
    });
  }

  drawStory();
  container.replaceChildren(playerEl);
  return playerEl;
}
