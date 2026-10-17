/**
 * VitrineDetail component — renders the main-area view for Vitrine,
 * similar to UpdatesDetail in Canais tab, with catalog products.
 */

import { ICON_STORE } from '../lib/commercial-content.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';

function vitrineDetailAvatar(entry) {
  const el = document.createElement('span');
  el.className = 'updates-avatar vitrine-detail-avatar';
  if (entry?.avatar) {
    const img = document.createElement('img');
    img.src = entry.avatar;
    img.alt = '';
    el.appendChild(img);
  } else if (entry) {
    el.innerHTML = defaultAvatarSvg(entry.id);
  }
  return el;
}

export function renderVitrineDetail(container, { entry, onBack, onConversation, onGoToAnunciar, onShowToast }) {
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
