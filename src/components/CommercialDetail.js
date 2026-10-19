/** Available advertising formats and their server-confirmed purchase flows. */
import { PLATFORM_PRODUCTS } from '../lib/commercial-content.js';
import { openStatusPurchaseModal } from './StatusPurchaseModal.js';
import { openVitrinePurchaseModal } from './VitrinePurchaseModal.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';

export function renderCommercialDetail(container, { activeSection = 'anunciar', onBack, onNavigateTab, onShowToast }) {
  const el = document.createElement('section');
  el.className = 'commercial-detail';
  el.setAttribute('aria-label', 'Anunciar no vorcarozap');
  el.innerHTML = `
    <header class="commercial-detail-header">
      <button type="button" class="commercial-back-btn" aria-label="Voltar às conversas">${ICON_BACK}</button>
      <div class="commercial-detail-header-info">
        <h1 class="commercial-detail-title">Anuncie no vorcarozap</h1>
        <p class="commercial-detail-subtitle">Escolha seu espaço. Prepare seu anúncio. Apareça.</p>
      </div>
    </header>
    <div class="commercial-detail-body">
      <div class="commercial-hero-banner">
        <div class="commercial-hero-tag">Status + Vitrine</div>
        <h2 class="commercial-hero-title">Faça sua marca aparecer.</h2>
        <p class="commercial-hero-text">Uma oferta, uma novidade ou seu próximo lançamento. Escolha entre os dois formatos disponíveis e mostre o que você faz para quem explora o vorcarozap.</p>
        <div class="commercial-hero-note">Você monta e revisa seu anúncio antes de pagar.</div>
      </div>
      <div class="commercial-products-heading">
        <h2>Onde você quer aparecer?</h2>
        <span>2 formatos disponíveis</span>
      </div>
      <div class="commercial-products-grid"></div>
      <ol class="commercial-how" aria-label="Como anunciar">
        <li><span class="commercial-how-number" aria-hidden="true">1</span><div><strong>Escolha o formato</strong><span>Status ou Vitrine, com plano normal ou impulsionado.</span></div></li>
        <li><span class="commercial-how-number" aria-hidden="true">2</span><div><strong>Monte seu anúncio</strong><span>Adicione suas imagens, legenda e perfil social.</span></div></li>
        <li><span class="commercial-how-number" aria-hidden="true">3</span><div><strong>Revise e pague</strong><span>A publicação acontece após a confirmação do pagamento.</span></div></li>
      </ol>
    </div>
  `;
  el.querySelector('.commercial-back-btn').addEventListener('click', () => onBack?.());
  const grid = el.querySelector('.commercial-products-grid');
  for (const product of PLATFORM_PRODUCTS) {
    const card = document.createElement('article');
    card.className = `product-card ${product.tagClass}`;
    card.dataset.productId = product.id;
    card.classList.toggle('product-card--selected', activeSection === product.targetRoute);
    card.innerHTML = `
      <div class="product-card-top"><div class="product-card-badge">${escapeHtml(product.tag)}</div><span class="product-format-number">0${product.number}</span></div>
      <div class="product-card-header">
        <div class="product-card-icon" style="background: ${product.iconBg}; color: ${product.iconColor};">${product.iconSvg}</div>
        <div class="product-card-titles"><h3 class="product-card-name">${escapeHtml(product.name)}</h3><span class="product-card-slogan">${escapeHtml(product.slogan)}</span></div>
      </div>
      <p class="product-card-desc">${escapeHtml(product.description)}</p>
      <ul class="product-card-features">${product.features.map(feature => `<li><span class="product-feat-icon">${ICON_CHECK}</span><span>${escapeHtml(feature)}</span></li>`).join('')}</ul>
      <div class="product-card-footer">
        <div class="product-card-price"><span class="product-price-label">Plano normal · 1 imagem</span><span class="product-price-val">${escapeHtml(product.price)}</span></div>
        <div class="product-card-actions">
          <button type="button" class="product-btn-primary">${escapeHtml(product.ctaPrimary)}</button>
          <button type="button" class="product-btn-secondary">${escapeHtml(product.ctaSecondary)}</button>
        </div>
      </div>
    `;
    card.querySelector('.product-btn-primary').addEventListener('click', () => {
      const openPurchase = product.id === 'product-status' ? openStatusPurchaseModal : openVitrinePurchaseModal;
      openPurchase({
        initialPlan: `${product.targetRoute}_normal`,
        onPublished: purchase => {
          onShowToast?.(`Anúncio de ${purchase.user_handle} publicado com sucesso!`);
          onNavigateTab?.(product.targetRoute, purchase.id);
        },
      });
    });
    card.querySelector('.product-btn-secondary').addEventListener('click', () => onNavigateTab?.(product.targetRoute));
    grid.appendChild(card);
  }
  container.replaceChildren(el);
  const selected = grid.querySelector('.product-card--selected');
  if (selected) requestAnimationFrame(() => { if (selected.isConnected) selected.scrollIntoView?.({ block: 'nearest' }); });
  return el;
}
