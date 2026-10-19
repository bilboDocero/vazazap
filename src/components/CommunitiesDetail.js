/**
 * CommunitiesDetail component — renders the right main-area view for Comunidades.
 */

import {
  ICON_COMMUNITY_PEOPLE,
  ICON_LOCK,
  ICON_MEGAPHONE,
} from '../lib/communities-content.js';
import { ICON_SEARCH, ICON_MEETBALL } from '../lib/icons.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const ICON_CHECKS = '<svg viewBox="0 0 16 11" width="16" height="11" fill="none"><path d="M11 1L5.5 8.5L2 5" stroke="#53BDEB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 1L9 8.5" stroke="#53BDEB" stroke-width="1.6" stroke-linecap="round"/></svg>';

function publicLink(url, label) {
  try {
    if (new URL(url).protocol !== 'https:') return null;
  } catch { return null; }
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}

function renderEditorialContent(bubble, msg) {
  const text = bubble.querySelector('.communities-bubble-text');
  if (msg.label) {
    const label = document.createElement('div');
    label.className = 'communities-news-label';
    label.textContent = msg.label;
    bubble.insertBefore(label, text);
  }
  if (msg.title) {
    const title = document.createElement('h3');
    title.className = 'communities-news-title';
    title.textContent = msg.title;
    bubble.insertBefore(title, text);
  }
  if (msg.image?.src?.startsWith('/assets/communities/')) {
    const figure = document.createElement('figure');
    figure.className = 'communities-news-image';
    const img = document.createElement('img');
    img.src = msg.image.src;
    img.alt = msg.image.alt || '';
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    if (msg.image.width && msg.image.height) {
      img.width = msg.image.width;
      img.height = msg.image.height;
    }
    const caption = document.createElement('figcaption');
    caption.textContent = `${msg.image.caption} Foto: ${msg.image.credit}. `;
    const original = publicLink(msg.image.sourceUrl, 'Origem da foto');
    if (original) caption.appendChild(original);
    figure.append(img, caption);
    bubble.insertBefore(figure, bubble.querySelector('.communities-news-label, .communities-news-title, .communities-bubble-text'));
  }
  if (msg.sources?.length) {
    const sources = document.createElement('div');
    sources.className = 'communities-news-sources';
    for (const source of msg.sources) {
      const link = publicLink(source.url, `${source.publisher} · ${source.title}`);
      if (!link) continue;
      const item = document.createElement('div');
      const date = document.createElement('span');
      date.textContent = `Fonte publicada em ${source.publishedAt.split('-').reverse().join('/')}`;
      item.append(link, date);
      sources.appendChild(item);
    }
    text.after(sources);
  }
}

export function renderCommunitiesDetail(container, { selection, onBack, onCreateCommunity, onSelectGroup }) {
  const el = document.createElement('section');
  el.className = `communities-detail${selection ? ' has-selection' : ''}`;

  if (!selection) {
    // Default Welcome / Empty state
    el.innerHTML = `
      <div class="communities-welcome">
        <div class="communities-welcome-icon">
          <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
            <circle cx="40" cy="40" r="40" fill="#E6F3EC"/>
            <g transform="translate(20, 20)" fill="#008069">
              <circle cx="20" cy="11.5" r="4.6"/>
              <circle cx="7.5" cy="15" r="3.6"/>
              <circle cx="32.5" cy="15" r="3.6"/>
              <path d="M10.8 31.5v-3.6c0-4.1 4-7.2 9.2-7.2s9.2 3.1 9.2 7.2v3.6H10.8ZM1.7 30v-3.3c0-3.3 2.6-5.6 6.3-5.6 1.3 0 2.5.3 3.5.8A10 10 0 0 0 7.5 30H1.7Zm30.8 0a10 10 0 0 0-4-8.1c1-.5 2.2-.8 3.5-.8 3.7 0 6.3 2.3 6.3 5.6V30h-5.8Z"/>
            </g>
          </svg>
        </div>
        <h2 class="communities-welcome-title">Comunidades</h2>
        <p class="communities-welcome-text">
          As comunidades reúnem membros em grupos por tópicos e facilitam o envio de avisos dos administradores. Qualquer comunidade de que você fizer parte aparecerá aqui.
        </p>
        <button type="button" class="communities-welcome-btn">
          Nova comunidade
        </button>
      </div>
    `;

    el.querySelector('.communities-welcome-btn')?.addEventListener('click', () => {
      if (onCreateCommunity) onCreateCommunity();
    });

    container.replaceChildren(el);
    return el;
  }

  const { type, community, group } = selection;

  if (type === 'group' && group) {
    // Group / Announcements Chat View
    el.innerHTML = `
      <header class="communities-chat-header">
        <button class="communities-back-btn" aria-label="Voltar às comunidades">
          ${ICON_BACK}
        </button>
        <div class="communities-chat-avatar">
          ${group.avatarSvg}
        </div>
        <div class="communities-chat-info">
          <div class="communities-chat-name">${escapeHtml(group.name)}</div>
          <div class="communities-chat-subtext">${escapeHtml(community.name)} · ${escapeHtml(community.tagline || community.membersCount || '')}</div>
        </div>
        <div class="communities-chat-actions">
          <button class="communities-action-btn" disabled aria-label="Pesquisar">${ICON_SEARCH}</button>
          <button class="communities-action-btn" disabled aria-label="Menu">${ICON_MEETBALL}</button>
        </div>
      </header>

      <div class="communities-chat-body">
        <div class="communities-notice-banner">
          <span class="communities-notice-icon">${ICON_LOCK}</span>
          <span>As mensagens deste grupo de avisos são enviadas apenas pelos administradores da comunidade.</span>
        </div>

        <div class="communities-chat-messages"></div>
      </div>

      <footer class="communities-chat-footer">
        <span class="communities-footer-lock">${ICON_LOCK}</span>
        <span class="communities-footer-text">Somente administradores podem enviar mensagens</span>
      </footer>
    `;

    el.querySelector('.communities-back-btn')?.addEventListener('click', onBack);

    if (community.editorial) {
      el.querySelector('.communities-notice-banner span:last-child').textContent =
        `Resumos da curadoria · Datas das fontes · Revisado em ${community.reviewedAt.split('-').reverse().join('/')}`;
      el.querySelector('.communities-footer-text').textContent = 'Curadoria de fontes públicas · Abra os links para ler os documentos e reportagens';
    }

    const messagesContainer = el.querySelector('.communities-chat-messages');
    const messages = group.messages || [];

    let lastDate = '';
    messages.forEach((msg) => {
      if (msg.date && msg.date !== lastDate) {
        lastDate = msg.date;
        const datePill = document.createElement('div');
        datePill.className = 'communities-date-pill';
        datePill.textContent = msg.date;
        messagesContainer.appendChild(datePill);
      }

      if (msg.system) {
        const sysMsg = document.createElement('div');
        sysMsg.className = 'communities-sys-message';
        sysMsg.textContent = msg.text;
        messagesContainer.appendChild(sysMsg);
      } else {
        const bubble = document.createElement('div');
        bubble.className = 'communities-bubble';
        bubble.dataset.messageId = msg.id;

        const senderColor = msg.senderColor || '#008069';
        const formattedText = escapeHtml(msg.text).replace(/\n/g, '<br/>');

        bubble.innerHTML = `
          <div class="communities-bubble-sender" style="color: ${senderColor}">
            ${escapeHtml(msg.sender || 'Administrador')}
          </div>
          <div class="communities-bubble-text">
            ${formattedText}
          </div>
          <div class="communities-bubble-meta">
            <span class="communities-bubble-time">${escapeHtml(msg.time || '')}</span>
            <span class="communities-bubble-checks">${ICON_CHECKS}</span>
          </div>
        `;
        renderEditorialContent(bubble, msg);
        if (community.editorial) bubble.querySelector('.communities-bubble-checks').remove();
        messagesContainer.appendChild(bubble);
      }
    });

    container.replaceChildren(el);
    return el;
  }

  // Community Overview View
  el.innerHTML = `
    <header class="communities-chat-header">
      <button class="communities-back-btn" aria-label="Voltar às comunidades">
        ${ICON_BACK}
      </button>
      <div class="communities-chat-info">
        <div class="communities-chat-name">Dados da comunidade</div>
      </div>
    </header>

    <div class="communities-overview-body">
      <div class="communities-overview-hero">
        <div class="communities-overview-avatar">
          ${community.avatarSvg}
        </div>
        <h2 class="communities-overview-title">${escapeHtml(community.name)}</h2>
        <span class="communities-overview-members">Comunidade · ${escapeHtml(community.tagline || community.membersCount || 'Membros')}</span>
      </div>

      <div class="communities-overview-desc-box">
        <h3>Descrição</h3>
        <p>${escapeHtml(community.description || 'Sem descrição.')}</p>
      </div>

      <div class="communities-overview-groups-section">
        <h3>Grupos nesta comunidade</h3>
        <div class="communities-overview-groups-list"></div>
      </div>
    </div>
  `;

  el.querySelector('.communities-back-btn')?.addEventListener('click', onBack);

  const groupsList = el.querySelector('.communities-overview-groups-list');
  (community.groups || []).forEach((g) => {
    const item = document.createElement('div');
    item.className = 'communities-overview-group-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    item.innerHTML = `
      <div class="communities-overview-group-avatar">
        ${g.avatarSvg}
      </div>
      <div class="communities-overview-group-info">
        <div class="communities-overview-group-name">${escapeHtml(g.name)}</div>
        <div class="communities-overview-group-snippet">${escapeHtml(g.snippet || '')}</div>
      </div>
      <button type="button" class="communities-overview-open-btn">Abrir</button>
    `;

    const openAction = () => {
      if (onSelectGroup) onSelectGroup(g.id);
    };

    item.addEventListener('click', openAction);
    item.querySelector('.communities-overview-open-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openAction();
    });

    groupsList.appendChild(item);
  });

  container.replaceChildren(el);
  return el;
}
