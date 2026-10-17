/**
 * VitrineDetail component — renders the main-area view for Vitrine,
 * with support for published vitrine showcase (story viewer with auto-advance)
 * and partner catalog products.
 */

import { ICON_STORE } from '../lib/commercial-content.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { loadCachedVitrines, SOCIAL_NETWORKS } from '../lib/vitrine-db.js';
import { openVitrinePurchaseModal } from './VitrinePurchaseModal.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';

function vitrineDetailAvatar(entry) {
  const el = document.createElement('span');
  el.className = 'updates-avatar vitrine-detail-avatar';
  const pic = entry?.avatar || entry?.profile_pic;
  if (pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = '';
    el.appendChild(img);
  } else if (entry) {
    el.innerHTML = defaultAvatarSvg(entry.id);
  }
  return el;
}

export function renderVitrineDetail(container, { entry, onBack, onConversation, onGoToAnunciar, onSelectVitrine, onShowToast }) {
  const isPurchasedVitrine = entry && (entry.media_files || entry.social_network);

  if (isPurchasedVitrine) {
    return renderVitrineStoryViewer(container, { entry, onBack, onSelectVitrine });
  }

  const el = document.createElement('section');
  el.className = `updates-detail vitrine-detail${entry ? ' has-selection' : ''}`;

  const header = document.createElement('header');
  header.className = 'updates-detail-header';

  const back = document.createElement('button');
  back.className = 'updates-back';
  back.setAttribute('aria-label', 'Voltar às vitrines');
  back.innerHTML = ICON_BACK;
  back.addEventListener('click', onBack);
  header.appendChild(back);

  if (entry) header.appendChild(vitrineDetailAvatar(entry));

  const title = document.createElement('span');
  title.textContent = entry?.name || 'Vitrines & Catálogos Comerciais';
  header.appendChild(title);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'updates-detail-body vitrine-detail-body';

  if (!entry) {
    // Welcome / Empty view
    const icon = document.createElement('div');
    icon.className = 'updates-detail-icon vitrine-detail-icon';
    icon.innerHTML = ICON_STORE;

    const badge = document.createElement('span');
    badge.className = 'updates-preview-label vitrine-preview-label';
    badge.textContent = 'Espaço Comercial · Vitrine Ativa';

    const heading = document.createElement('h2');
    heading.textContent = 'Explore as vitrines comerciais e catálogos';

    const text = document.createElement('p');
    text.textContent = 'Navegue pelos catálogos comerciais dos contatos, acompanhe produtos de alta liquidez e serviços estruturados.';

    const btnAnunciar = document.createElement('button');
    btnAnunciar.className = 'updates-open-conversation vitrine-btn-anunciar';
    btnAnunciar.textContent = 'Ver Ferramentas Comerciais & Anunciar';
    btnAnunciar.addEventListener('click', () => {
      if (onGoToAnunciar) onGoToAnunciar();
    });

    body.append(icon, badge, heading, text, btnAnunciar);
  } else {
    // Selected Vitrine view with products
    const descBox = document.createElement('div');
    descBox.className = 'vitrine-desc-box';
    descBox.innerHTML = `
      <div class="vitrine-badge-row">
        <span class="vitrine-tag-badge">${escapeHtml(entry.badge || 'Vitrine')}</span>
        <span class="vitrine-subtitle-text">${escapeHtml(entry.subtitle || '')}</span>
      </div>
      <p class="vitrine-desc-text">${escapeHtml(entry.description || '')}</p>
    `;
    body.appendChild(descBox);

    const products = entry.products || [];
    if (products.length > 0) {
      const prodSection = document.createElement('div');
      prodSection.className = 'vitrine-products-section';

      const prodHeading = document.createElement('h3');
      prodHeading.className = 'vitrine-section-heading';
      prodHeading.textContent = `Itens em destaque no catálogo (${products.length})`;
      prodSection.appendChild(prodHeading);

      const grid = document.createElement('div');
      grid.className = 'vitrine-catalog-grid';

      products.forEach((prod) => {
        const item = document.createElement('div');
        item.className = 'vitrine-catalog-item';

        item.innerHTML = `
          <div class="vitrine-item-top">
            <span class="vitrine-item-cat">${escapeHtml(prod.category || 'Item')}</span>
            <span class="vitrine-item-price">${escapeHtml(prod.price || '')}</span>
          </div>
          <h4 class="vitrine-item-name">${escapeHtml(prod.name)}</h4>
          <p class="vitrine-item-desc">${escapeHtml(prod.description)}</p>
          <button type="button" class="vitrine-item-btn">Solicitar item</button>
        `;

        item.querySelector('.vitrine-item-btn').addEventListener('click', () => {
          if (onShowToast) onShowToast(`Interesse registrado em "${prod.name}"`);
          if (entry.conversationId && onConversation) {
            onConversation(entry.conversationId);
          }
        });

        grid.appendChild(item);
      });

      prodSection.appendChild(grid);
      body.appendChild(prodSection);
    }

    if (entry.conversationId) {
      const chat = document.createElement('button');
      chat.className = 'updates-open-conversation';
      chat.textContent = 'Ver histórico da conversa deste contato';
      chat.addEventListener('click', () => onConversation(entry.conversationId));
      body.appendChild(chat);
    }
  }

  el.appendChild(body);
  container.replaceChildren(el);
  return el;
}

function renderVitrineStoryViewer(container, { entry, onBack, onSelectVitrine }) {
  const publishedList = loadCachedVitrines();
  const currentClientIdx = publishedList.findIndex(item => item.id === entry.id);

  const nextClient = (currentClientIdx !== -1 && currentClientIdx < publishedList.length - 1)
    ? publishedList[currentClientIdx + 1]
    : null;
  const prevClient = (currentClientIdx > 0)
    ? publishedList[currentClientIdx - 1]
    : null;

  const mediaList = entry.media_files && entry.media_files.length > 0
    ? entry.media_files
    : [{ id: 'm1', name: 'Vitrine', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', caption: entry.caption || '' }];

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
      if (onSelectVitrine) {
        onSelectVitrine(nextClient.id);
      } else {
        window.location.hash = `#/vitrine/${nextClient.id}`;
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
      if (onSelectVitrine) {
        onSelectVitrine(prevClient.id);
      } else {
        window.location.hash = `#/vitrine/${prevClient.id}`;
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
              ${escapeHtml(entry.profile_name || 'Vitrine Comercial')}
              ${entry.plan_type === 'vitrine_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
            </div>
            <div class="story-header-meta">${escapeHtml(entry.user_handle || '@vitrine')} · ${net.name}</div>
          </div>
        </div>
        <button type="button" class="story-close-btn" aria-label="Fechar vitrine">&times;</button>
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
          <span>Visitar vitrine no ${net.name} (${escapeHtml(entry.user_handle || 'user')}) ↗</span>
        </a>

        <button type="button" class="story-publish-more-btn">
          + Contratar e publicar outra vitrine
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
      openVitrinePurchaseModal({
        onPublished: (pub) => {
          window.location.hash = `#/vitrine/${pub.id}`;
        },
      });
    });
  }

  drawStory();
  container.replaceChildren(playerEl);
  return playerEl;
}
