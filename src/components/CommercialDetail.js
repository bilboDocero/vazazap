/**
 * CommercialDetail component — renders the 4 product cards inside class="main-area"
 * and handles interactions, tab redirection, and product acquisition flow.
 */

import { PLATFORM_PRODUCTS, saveCommercialPurchase, loadCommercialPurchases } from '../lib/commercial-content.js';
import { openStatusPurchaseModal } from './StatusPurchaseModal.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';

export function renderCommercialDetail(container, { activeSection = 'catalogo', onBack, onNavigateTab, onShowToast }) {
  const el = document.createElement('section');
  el.className = 'commercial-detail';

  el.innerHTML = `
    <header class="commercial-detail-header">
      <button class="commercial-back-btn" aria-label="Voltar às ferramentas">
        ${ICON_BACK}
      </button>
      <div class="commercial-detail-header-info">
        <h1 class="commercial-detail-title">Vitrine & Anúncios Comerciais</h1>
        <p class="commercial-detail-subtitle">Comercialize e impulsione seus produtos nas abas estratégicas da plataforma</p>
      </div>
    </header>

    <div class="commercial-detail-body">
      <div class="commercial-hero-banner">
        <div class="commercial-hero-tag">Produtos da Plataforma</div>
        <h2 class="commercial-hero-title">Espaços Comerciais Disponíveis</h2>
        <p class="commercial-hero-text">
          Selecione abaixo os produtos para ativação imediata nas respectivas abas do VorcaroZap (Status, Canais, Comunidades e Vitrine).
        </p>
      </div>

      <div class="commercial-products-grid"></div>
    </div>
  `;

  el.querySelector('.commercial-back-btn').addEventListener('click', onBack);

  const grid = el.querySelector('.commercial-products-grid');
  const purchasedIds = new Set(loadCommercialPurchases());

  PLATFORM_PRODUCTS.forEach((product) => {
    const card = document.createElement('article');
    card.className = `product-card ${product.tagClass}`;
    card.dataset.productId = product.id;

    const isPurchased = purchasedIds.has(product.id);

    const featuresHtml = product.features
      .map(feat => `<li><span class="product-feat-icon">${ICON_CHECK}</span><span>${escapeHtml(feat)}</span></li>`)
      .join('');

    card.innerHTML = `
      <div class="product-card-top">
        <div class="product-card-badge">
          <span>${product.number}. Comercializado na ${escapeHtml(product.tag)}</span>
        </div>
        ${isPurchased ? '<span class="product-purchased-badge">Ativo</span>' : ''}
      </div>

      <div class="product-card-header">
        <div class="product-card-icon" style="background: ${product.iconBg}; color: ${product.iconColor};">
          ${product.iconSvg}
        </div>
        <div class="product-card-titles">
          <h3 class="product-card-name">${escapeHtml(product.name)}</h3>
          <span class="product-card-slogan">${escapeHtml(product.slogan)}</span>
        </div>
      </div>

      <p class="product-card-desc">
        ${escapeHtml(product.description)}
      </p>

      <ul class="product-card-features">
        ${featuresHtml}
      </ul>

      <div class="product-card-footer">
        <div class="product-card-price">
          <span class="product-price-label">Preço comercial</span>
          <span class="product-price-val">${escapeHtml(product.price)}</span>
        </div>

        <div class="product-card-actions">
          <button type="button" class="product-btn-primary" aria-label="${escapeHtml(product.ctaPrimary)}">
            ${escapeHtml(product.ctaPrimary)}
          </button>
          <button type="button" class="product-btn-secondary" aria-label="${escapeHtml(product.ctaSecondary)}">
            ${escapeHtml(product.ctaSecondary)}
          </button>
        </div>
      </div>
    `;

    // Action 1: Navigate to the target tab
    card.querySelector('.product-btn-primary').addEventListener('click', () => {
      if (onNavigateTab) onNavigateTab(product.targetRoute);
    });

    // Action 2: Open acquisition / contract modal
    card.querySelector('.product-btn-secondary').addEventListener('click', () => {
      if (product.id === 'product-status') {
        openStatusPurchaseModal({
          initialPlan: 'status_normal',
          onPublished: (pub) => {
            if (onShowToast) onShowToast(`Status de ${pub.user_handle} publicado com sucesso!`);
            if (onNavigateTab) onNavigateTab('status', pub.id);
          },
        });
      } else {
        openAcquisitionModal(product);
      }
    });

    grid.appendChild(card);
  });

  function openAcquisitionModal(product) {
    let modalEl = document.querySelector('.commercial-modal-overlay');
    if (modalEl) modalEl.remove();

    modalEl = document.createElement('div');
    modalEl.className = 'commercial-modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', `Contratar ${product.name}`);

    modalEl.innerHTML = `
      <div class="commercial-modal">
        <div class="commercial-modal-header">
          <h2>Contratar: ${escapeHtml(product.name)}</h2>
          <button class="commercial-modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="commercial-modal-body">
          <div class="commercial-modal-product-summary">
            <div class="commercial-modal-icon" style="background: ${product.iconBg}; color: ${product.iconColor};">
              ${product.iconSvg}
            </div>
            <div>
              <div class="commercial-modal-pname">${escapeHtml(product.name)}</div>
              <div class="commercial-modal-ptag">Comercializado na ${escapeHtml(product.tag)}</div>
              <div class="commercial-modal-pprice">${escapeHtml(product.price)}</div>
            </div>
          </div>

          <form class="commercial-modal-form">
            <label class="commercial-form-label">
              <span>Nome do anunciante ou empresa</span>
              <input type="text" class="commercial-input-name" placeholder="Ex: Master Investimentos ou Daniel Vorcaro" required autofocus />
            </label>
            <label class="commercial-form-label">
              <span>Contato / WhatsApp comercial</span>
              <input type="text" class="commercial-input-contact" placeholder="+55 11 99999-9999" required />
            </label>
            <label class="commercial-form-label">
              <span>Instruções ou link da campanha</span>
              <textarea class="commercial-input-notes" rows="2" placeholder="Descreva os materiais a veicular ou deixe instruções adicionais..."></textarea>
            </label>

            <div class="commercial-modal-actions">
              <button type="button" class="commercial-btn-cancel">Cancelar</button>
              <button type="submit" class="commercial-btn-submit">Confirmar ativação</button>
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

    modalEl.querySelector('.commercial-modal-close').addEventListener('click', closeModal);
    modalEl.querySelector('.commercial-btn-cancel').addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    const form = modalEl.querySelector('.commercial-modal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCommercialPurchase(product.id);
      closeModal();
      if (onShowToast) onShowToast(`Produto "${product.name}" ativado com sucesso!`);
      if (onNavigateTab) onNavigateTab(product.targetRoute);
    });

    document.body.appendChild(modalEl);
    document.addEventListener('keydown', handleKey);
    requestAnimationFrame(() => modalEl.classList.add('open'));
  }

  container.replaceChildren(el);
  return el;
}
