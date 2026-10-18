/**
 * StatusPurchaseModal component — handles the purchase flow and publication
 * of a Status (Normal or Impulsionado) with Asaas real payment integration
 * (PIX QR Code / Copia e Cola & Cartão de Crédito) and PostgreSQL persistence.
 *
 * Sequence: 1. Plano -> 2. Edição -> 3. Pagamento -> 4. Preview
 */

import {
  SOCIAL_NETWORKS,
  calculateStatusPrice,
  buildSocialLink,
  createStatusPurchase,
} from '../lib/status-db.js';
import { escapeHtml, sanitizeUrl, escapeAttr, copyText, processAvatarImage } from '../lib/utils.js';
import { mountWalletButton } from '../lib/stripe-client.js';

const ICON_CHECK_CIRCLE = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none"><circle cx="12" cy="12" r="11" fill="#00A884"/><path d="M7 12.5l3.5 3.5 7-7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PLUS_SIGN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>`;
const ICON_BACK_ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const ICON_PIX = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"/></svg>`;
const ICON_CARD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
const ICON_APPLE_PAY = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>`;
const ICON_GOOGLE_PAY = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>`;
const ICON_LINK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max per attachment

export function openStatusPurchaseModal({ onPublished, initialPlan = 'status_normal' } = {}) {
  let modalEl = document.querySelector('.status-modal-overlay');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'status-modal-overlay';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', 'Contratar Status / Story');

  // State: Standardized sequence [1. Plano -> 2. Edição -> 3. Pagamento -> 4. Preview]
  let currentStep = 1;
  let selectedPlan = initialPlan;
  let fileCount = 1;

  // Content & Profile State (captured in Step 2: Edição)
  let profilePicData = '';
  let profileName = '';
  let userHandle = '';
  let caption = '';
  let uploadedFiles = []; // array of { id, name, url, type, caption }
  let activeFileIndex = -1;
  let selectedNetwork = 'instagram';
  let previewActiveIdx = 0;
  let uploadError = '';

  // Payment State (Asaas v3, captured in Step 3: Pagamento)
  let selectedBillingType = 'PIX';
  let customerCpf = '';
  let asaasPaymentId = null;
  let statusRecordId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let pixData = null;
  let processingWallet = null;
  let paymentError = '';
  let paymentApproved = false;
  let pollIntervalId = null;

  // Credit Card Form State
  let cardHolderName = '';
  let cardNumber = '';
  let cardExpiry = '';
  let cardCcv = '';
  let cardCep = '';
  let cardAddressNumber = '';

  function stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  function closeModal() {
    stopPolling();
    modalEl.classList.remove('open');
    setTimeout(() => modalEl.remove(), 200);
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function startPaymentPolling(paymentId, recordId) {
    stopPolling();
    pollIntervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?paymentId=${encodeURIComponent(paymentId)}&recordId=${encodeURIComponent(recordId)}&type=status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.isPaid) {
          stopPolling();
          currentStep = 4; // Advance to Preview!
          render();
        }
      } catch (err) {
        console.warn('[Payment Polling Error]', err);
      }
    }, 3000);
  }

  function render() {
    const pricing = calculateStatusPrice({ planType: selectedPlan, fileCount });

    modalEl.innerHTML = `
      <div class="status-modal-dialog">
        <header class="status-modal-header">
          <div class="status-modal-steps">
            <span class="status-step-pill ${currentStep >= 1 ? 'active' : ''}">Plano</span>
            <span class="status-step-pill ${currentStep >= 2 ? 'active' : ''}">Edição</span>
            <span class="status-step-pill ${currentStep >= 3 ? 'active' : ''}">Pagamento</span>
            <span class="status-step-pill ${currentStep >= 4 ? 'active' : ''}">Preview</span>
          </div>
          <button class="status-modal-close" aria-label="Fechar modal">&times;</button>
        </header>

        <div class="status-modal-content">
          ${renderStepContent(pricing)}
        </div>
      </div>
    `;

    wireEvents(pricing);
  }

  function renderStepContent(pricing) {
    // ── STEP 1: Escolha do Plano ──────────────────────────────
    if (currentStep === 1) {
      return `
        <div class="status-step-plan">
          <h2 class="status-modal-title">Escolha seu tipo de Status</h2>
          <p class="status-modal-desc">Publique stories na plataforma com alta visibilidade e link automático para sua rede social.</p>

          <div class="status-plans-selector">
            <label class="status-plan-card ${selectedPlan === 'status_normal' ? 'selected' : ''}">
              <input type="radio" name="plan" value="status_normal" ${selectedPlan === 'status_normal' ? 'checked' : ''} />
              <div class="status-plan-info">
                <div class="status-plan-top">
                  <span class="status-plan-name">Status Normal</span>
                  <span class="status-plan-price">R$ 4,90 <small>/arquivo</small></span>
                </div>
                <p class="status-plan-text">Veiculação de 24 horas no acervo, suporte a até 4 arquivos com desconto cumulativo.</p>
              </div>
            </label>

            <label class="status-plan-card ${selectedPlan === 'status_impulsionado' ? 'selected' : ''}">
              <input type="radio" name="plan" value="status_impulsionado" ${selectedPlan === 'status_impulsionado' ? 'checked' : ''} />
              <div class="status-plan-info">
                <div class="status-plan-top">
                  <span class="status-plan-name">Status Impulsionado</span>
                  <span class="status-plan-price">R$ 149,00 <small>/arquivo</small></span>
                </div>
                <p class="status-plan-text">Destaque prioritário no topo, anel de status verde de alta visibilidade e maior alcance.</p>
              </div>
            </label>
          </div>

          <div class="status-files-selector-group">
            <label class="status-files-label">
              <span>Quantidade de arquivos no Story:</span>
              <span class="status-files-count-badge">${fileCount} arquivo${fileCount > 1 ? 's' : ''}</span>
            </label>
            <div class="status-files-buttons">
              ${[1, 2, 3, 4].map(n => `
                <button type="button" class="status-file-btn ${fileCount === n ? 'active' : ''}" data-count="${n}">
                  ${n} ${n === 1 ? 'arquivo' : 'arquivos'}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="status-pricing-summary">
            <div class="status-pricing-row">
              <span>Valor base (${fileCount}x ${pricing.formattedUnit}):</span>
              <span>${pricing.formattedGross}</span>
            </div>
            ${pricing.discountAmount > 0 ? `
              <div class="status-pricing-row status-pricing-discount">
                <span>Desconto progressivo (${pricing.discountPercent}% OFF):</span>
                <span>- ${pricing.formattedDiscount}</span>
              </div>
            ` : ''}
            <div class="status-pricing-total">
              <span>Total a pagar:</span>
              <span class="status-total-val">${pricing.formattedTotal}</span>
            </div>
          </div>

          <button type="button" class="status-btn-primary btn-advance-to-edit">
            Avançar para Edição (${pricing.formattedTotal}) &rarr;
          </button>
        </div>
      `;
    }

    // ── STEP 2: Edição do Story (Design Original Preservado) ─
    if (currentStep === 2) {
      const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
      const activeFile = (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length)
        ? uploadedFiles[activeFileIndex]
        : null;
      const currentCaption = activeFile ? (activeFile.caption || '') : (caption || '');

      return `
        <div class="status-step-upload">
          <h2 class="status-modal-title">Configurar seu Status</h2>
          <p class="status-modal-desc">Suba sua foto, defina o usuário da rede social e anexe até ${fileCount} arquivo${fileCount > 1 ? 's' : ''}.</p>

          <form class="status-publish-form">
            <div class="status-profile-section">
              <div class="status-avatar-upload-box">
                <label class="status-avatar-upload-label">
                  <div class="status-avatar-preview">
                    ${profilePicData
                      ? `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" class="status-avatar-img" />`
                      : `<div class="status-avatar-placeholder">${ICON_CAMERA}</div>`
                    }
                  </div>
                  <span class="status-avatar-btn-text">${profilePicData ? 'Alterar foto' : 'Enviar foto'}</span>
                  <input type="file" class="input-profile-pic" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                </label>
              </div>

              <div class="status-names-group">
                <label class="status-field-label">
                  <span>Nome de exibição</span>
                  <input type="text" class="input-profile-name" value="${escapeHtml(profileName)}" placeholder="Ex: Juliana Silva ou Loja do Vorcaro" required />
                </label>
              </div>
            </div>

            <div class="status-social-section">
              <label class="status-field-label">
                <span>Rede social</span>
                <div class="status-networks-list">
                  ${Object.values(SOCIAL_NETWORKS).map(net => `
                    <button type="button" class="status-network-btn ${selectedNetwork === net.id ? 'active' : ''}" data-net="${net.id}" style="--net-color: ${net.color}" aria-label="${net.name}" title="${net.name}">
                      ${net.icon}
                    </button>
                  `).join('')}
                </div>
              </label>

              <label class="status-field-label">
                <span>Usuário / Username no ${network.name}</span>
                <div class="status-username-wrapper">
                  ${network.prefix ? `<span class="status-username-prefix">${network.prefix}</span>` : ''}
                  <input type="text" class="input-user-handle" value="${escapeHtml(userHandle)}" placeholder="${network.placeholder}" required />
                </div>
              </label>

              <div class="status-social-link-preview">
                <span class="status-link-tag">Link automático:</span>
                <a href="#" target="_blank" rel="noopener noreferrer" class="status-generated-link">https://instagram.com/user</a>
              </div>
            </div>

            <div class="status-media-section">
              <div class="status-guidance-box">
                <div class="status-guidance-badge">Dimensões Ideais</div>
                <p>Recomendamos imagens verticais na proporção <strong>9:16 (1080 × 1920 px)</strong> para preencher toda a tela do status sem faixas. <br/>Vídeos não são aceitos no momento (máx. <strong>5 MB</strong> por anexo).</p>
              </div>

              <label class="status-field-label">
                <span>Anexos do Story (${uploadedFiles.length} de ${fileCount} contratados)</span>
              </label>

              ${uploadError ? `<div class="status-upload-error-msg" role="alert">${escapeHtml(uploadError)}</div>` : ''}

              <div class="status-files-dropzone">
                ${uploadedFiles.map((file, idx) => `
                  <div class="status-uploaded-tile ${idx === activeFileIndex ? 'selected' : ''}" data-id="${file.id}" role="button" tabindex="0" title="Clique para editar a legenda desta imagem">
                    <img src="${sanitizeUrl(file.url, true)}" alt="${escapeHtml(file.name)}" class="status-tile-img" />
                    <span class="status-tile-badge">#${idx + 1}</span>
                    <button type="button" class="status-tile-delete-btn" data-id="${file.id}" aria-label="Remover anexo" title="Remover anexo">&times;</button>
                  </div>
                `).join('')}

                ${uploadedFiles.length < fileCount ? `
                  <label class="status-upload-add-tile" title="Adicionar anexo (1 por vez, máx 5MB)">
                    <input type="file" class="input-media-files" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                    ${ICON_PLUS_SIGN}
                    <span>Adicionar</span>
                  </label>
                ` : ''}
              </div>
            </div>

            <label class="status-field-label">
              <span>Legenda do status (opcional)</span>
              <textarea class="input-caption" rows="2" placeholder="Digite uma legenda para este status...">${escapeHtml(currentCaption)}</textarea>
            </label>

            <div class="status-form-actions">
              <button type="button" class="status-btn-back-step btn-back-to-step1" aria-label="Voltar" title="Voltar">
                ${ICON_BACK_ARROW}
              </button>
              <button type="submit" class="status-btn-primary btn-advance-to-payment">
                Avançar para Pagamento (${pricing.formattedTotal}) &rarr;
              </button>
            </div>
          </form>
        </div>
      `;
    }

    // ── STEP 3: Pagamento com Fricção Mínima (Nome e User já capturados) ─
    if (currentStep === 3) {
      return `
        <div class="status-step-payment" style="text-align: left; width: 100%;">
          <h2 class="status-modal-title" style="text-align: center;">Pagamento Seguro</h2>
          <p class="status-modal-desc" style="text-align: center;">Liberação instantânea do seu Story com verificação automática.</p>

          <div class="status-receipt-box" style="margin-bottom: 16px;">
            <div class="status-receipt-row">
              <span>Anunciante:</span>
              <strong>${escapeHtml(profileName || 'Anunciante')} (${escapeHtml(userHandle ? (userHandle.startsWith('@') ? userHandle : '@' + userHandle) : '@user')})</strong>
            </div>
            <div class="status-receipt-row">
              <span>Plano:</span>
              <strong>${selectedPlan === 'status_impulsionado' ? 'Status Impulsionado' : 'Status Normal'} (${fileCount} arquivo${fileCount > 1 ? 's' : ''})</strong>
            </div>
            <div class="status-receipt-row">
              <span>Valor a pagar:</span>
              <strong style="color: #008069; font-size: 16px;">${pricing.formattedTotal}</strong>
            </div>
          </div>

          ${paymentError ? `
            <div class="payment-error-banner">
              ${escapeHtml(paymentError)}
            </div>
          ` : ''}

          <!-- Botões das Formas de Pagamento (Apple Pay, Google Pay, Pix e Cartão/Link) -->
          <div class="wallet-buttons-stack">
            <button type="button" class="btn-wallet-apple" data-wallet="apple_pay" ${processingWallet ? 'disabled' : ''}>
              ${ICON_APPLE_PAY}
              <span>${processingWallet === 'apple_pay' ? 'Processando autorização Apple Pay...' : `Pagar com Apple Pay (${pricing.formattedTotal})`}</span>
            </button>

            <button type="button" class="btn-wallet-google" data-wallet="google_pay" ${processingWallet ? 'disabled' : ''}>
              ${ICON_GOOGLE_PAY}
              <span>${processingWallet === 'google_pay' ? 'Processando autorização Google Pay...' : `Pagar com Google Pay (${pricing.formattedTotal})`}</span>
            </button>

            <button type="button" class="btn-wallet-pix" data-wallet="pix" ${processingWallet ? 'disabled' : ''}>
              ${ICON_PIX}
              <span>${processingWallet === 'pix' ? 'Gerando QR Code Pix...' : `Pagar com Pix Instantâneo (${pricing.formattedTotal})`}</span>
            </button>

            <button type="button" class="btn-wallet-link" data-wallet="link" ${processingWallet ? 'disabled' : ''}>
              ${ICON_LINK}
              <span>${processingWallet === 'link' ? 'Processando autorização...' : `Pagar com Carteira Digital / Link (${pricing.formattedTotal})`}</span>
            </button>
          </div>

          ${pixData ? `
            <div class="pix-qr-container" style="margin-top: 14px;">
              <span style="font-size: 13px; font-weight: 600; color: #111B21;">Escaneie o QR Code abaixo no app do seu banco:</span>
              <img src="${pixData.imageUrl || (pixData.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : '')}" alt="QR Code PIX" class="pix-qr-img" />

              <div class="pix-waiting-box">
                <span class="pix-pulse-dot"></span>
                <span>Aguardando confirmação do pagamento Pix...</span>
              </div>

              <span style="font-size: 12px; color: #64748B;">Ou copie o código Pix Copia e Cola:</span>
              <div class="pix-copia-cola-box">
                <input type="text" readonly class="pix-copia-cola-input" value="${escapeAttr(pixData.payload)}" />
                <button type="button" class="pix-copy-btn btn-copy-pix">Copiar Código</button>
              </div>
            </div>
          ` : ''}

          <!-- Container dinâmico Stripe Elements se disponível no aparelho -->
          <div class="stripe-wallet-section"></div>

          <!-- Aviso informativo sobre carteiras digitais -->
          <div class="wallet-disabled-notice">
            <strong>💳 Pagamento via Carteira Digital (Stripe):</strong><br/>
            O <strong>Apple Pay</strong> é acionado no Safari (iPhone/Mac) e o <strong>Google Pay</strong> no Chrome/Android. Caso o seu aparelho ou navegador não tenha uma carteira ativa configurada, a Stripe apresentará a opção segura de Cartão.
          </div>

          <button type="button" class="btn-back-to-step2" style="margin-top: 14px; width: 100%; border: 0; background: transparent; color: #64748B; font-size: 13px; cursor: pointer; text-decoration: underline;">
            &larr; Voltar para edição do story
          </button>
        </div>
      `;
    }

    // ── STEP 4: Pré-visualização do Status (Design Original) ─
    if (currentStep === 4) {
      const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
      const mediaList = uploadedFiles.length > 0
        ? uploadedFiles
        : [{ id: 'sample', name: 'Foto Exemplo', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', caption: '' }];

      const safeIdx = Math.min(previewActiveIdx, mediaList.length - 1);
      const activeMedia = mediaList[safeIdx];
      const activeCaption = activeMedia?.caption || caption || '';

      return `
        <div class="status-step-preview">
          <div style="text-align: center; margin-bottom: 8px;">
            <span style="display: inline-block; padding: 4px 12px; background: #DCFCE7; color: #15803D; border-radius: 12px; font-size: 12px; font-weight: 700;">
              ✓ Pagamento Confirmado
            </span>
          </div>

          <h2 class="status-modal-title">Pré-visualização do Status</h2>
          <p class="status-modal-desc">Confira exatamente como seu story será exibido antes de confirmar a publicação.</p>

          <div class="status-preview-frame">
            <div class="status-preview-screen">
              <div class="story-progress-bar">
                ${mediaList.map((m, idx) => `
                  <div class="story-progress-seg ${idx === safeIdx ? 'active' : (idx < safeIdx ? 'passed' : '')}"></div>
                `).join('')}
              </div>

              <header class="story-header">
                <div class="story-header-user">
                  <div class="story-header-avatar">
                    ${profilePicData
                      ? `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" />`
                      : `<div style="background:#00A884;width:100%;height:100%;display:grid;place-items:center;color:#fff;font-weight:700;">${(profileName || 'U').charAt(0)}</div>`
                    }
                  </div>
                  <div>
                    <div class="story-header-name">
                      ${escapeHtml(profileName || 'Anunciante Parceiro')}
                      ${selectedPlan === 'status_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
                    </div>
                    <div class="story-header-meta">${escapeHtml(userHandle ? (userHandle.startsWith('@') ? userHandle : `@${userHandle}`) : '@usuario')} · ${network.name}</div>
                  </div>
                </div>
              </header>

              <div class="status-preview-media-box">
                <img src="${sanitizeUrl(activeMedia.url, true)}" alt="${escapeHtml(activeMedia.name)}" class="status-preview-media-img" />

                ${mediaList.length > 1 ? `
                  <button type="button" class="status-preview-nav prev" aria-label="Mídia anterior">&#10094;</button>
                  <button type="button" class="status-preview-nav next" aria-label="Próxima mídia">&#10095;</button>
                ` : ''}
              </div>

              <footer class="story-footer">
                ${activeCaption ? `
                  <div class="story-caption-box">
                    <p class="story-caption-text">${escapeHtml(activeCaption)}</p>
                  </div>
                ` : ''}

                <div class="story-social-btn" style="background: ${escapeAttr(network.color)};">
                  ${network.icon}
                  <span>Visitar perfil no ${escapeHtml(network.name)} (${escapeHtml(userHandle || 'user')}) ↗</span>
                </div>
              </footer>
            </div>
          </div>

          <div class="status-preview-actions-bar">
            <button type="button" class="status-btn-edit-preview btn-back-to-edit">
              &larr; Voltar para editar
            </button>
            <button type="button" class="status-btn-primary btn-confirm-publish">
              Confirmar e Publicar Status
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  function wireEvents(pricing) {
    modalEl.querySelector('.status-modal-close')?.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    // ── Events Step 1: Plano ──────────────────────────────────
    if (currentStep === 1) {
      modalEl.querySelectorAll('input[name="plan"]').forEach(radio => {
        radio.addEventListener('change', () => {
          selectedPlan = radio.value;
          render();
        });
      });

      modalEl.querySelectorAll('.status-file-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          fileCount = Number(btn.dataset.count);
          if (uploadedFiles.length > fileCount) {
            uploadedFiles = uploadedFiles.slice(0, fileCount);
            if (activeFileIndex >= fileCount) activeFileIndex = -1;
          }
          render();
        });
      });

      modalEl.querySelector('.btn-advance-to-edit')?.addEventListener('click', () => {
        currentStep = 2; // Advance to Edição!
        render();
      });
    }

    // ── Events Step 2: Edição (Design Original) ───────────────
    else if (currentStep === 2) {
      const nameInput = modalEl.querySelector('.input-profile-name');
      const handleInput = modalEl.querySelector('.input-user-handle');
      const linkPreview = modalEl.querySelector('.status-generated-link');
      const captionInput = modalEl.querySelector('.input-caption');
      const profilePicInput = modalEl.querySelector('.input-profile-pic');
      const mediaInput = modalEl.querySelector('.input-media-files');

      function updateLink() {
        const username = handleInput ? handleInput.value.trim() || 'usuario' : 'usuario';
        const url = buildSocialLink(selectedNetwork, username);
        if (linkPreview) {
          linkPreview.textContent = url;
          linkPreview.href = url;
        }
      }

      handleInput?.addEventListener('input', () => {
        userHandle = handleInput.value.trim();
        updateLink();
      });

      nameInput?.addEventListener('input', () => {
        profileName = nameInput.value;
      });

      captionInput?.addEventListener('input', () => {
        const val = captionInput.value;
        caption = val;
        if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length) {
          uploadedFiles[activeFileIndex].caption = val;
        }
      });

      updateLink();

      // Click on uploaded tile to switch active attachment
      modalEl.querySelectorAll('.status-uploaded-tile').forEach((tile) => {
        tile.addEventListener('click', (e) => {
          if (e.target.closest('.status-tile-delete-btn')) return;
          const fileId = tile.dataset.id;
          const foundIdx = uploadedFiles.findIndex(f => f.id === fileId);
          if (foundIdx !== -1) {
            if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length && captionInput) {
              uploadedFiles[activeFileIndex].caption = captionInput.value;
            }
            activeFileIndex = foundIdx;
            caption = uploadedFiles[foundIdx].caption || '';
            if (captionInput) {
              captionInput.value = caption;
              captionInput.focus();
            }
            modalEl.querySelectorAll('.status-uploaded-tile').forEach(t => {
              t.classList.toggle('selected', t.dataset.id === fileId);
            });
          }
        });
      });

      // Social network switch
      modalEl.querySelectorAll('.status-network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedNetwork = btn.dataset.net;
          if (nameInput) profileName = nameInput.value;
          if (handleInput) userHandle = handleInput.value.trim();
          if (captionInput && activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length) {
            uploadedFiles[activeFileIndex].caption = captionInput.value;
          }
          caption = captionInput ? captionInput.value : '';
          render();
        });
      });

      // Profile pic upload (processed via Canvas API to ~256x256 square crop)
      profilePicInput?.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.type && !file.type.startsWith('image/')) {
          uploadError = 'Vídeos não são permitidos. Envie uma imagem em JPG, PNG ou WEBP.';
          render();
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          uploadError = `A foto excede o tamanho máximo de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
          render();
          return;
        }

        uploadError = '';
        try {
          profilePicData = await processAvatarImage(file, 256, 0.85);
          const preview = modalEl.querySelector('.status-avatar-preview');
          if (preview) {
            preview.innerHTML = `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" class="status-avatar-img" />`;
          }
        } catch (err) {
          uploadError = 'Erro ao processar imagem de avatar: ' + err.message;
          render();
        }
      });

      // Media attachment upload
      mediaInput?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.type && !file.type.startsWith('image/')) {
          uploadError = 'Vídeos não são permitidos. Envie uma imagem vertical (9:16) em JPG, PNG ou WEBP.';
          render();
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          uploadError = `O arquivo "${file.name}" excede o tamanho máximo de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
          render();
          return;
        }

        if (uploadedFiles.length < fileCount) {
          uploadError = '';
          const reader = new FileReader();
          reader.onload = (ev) => {
            const newFile = {
              id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              url: ev.target.result,
              type: file.type || 'image/jpeg',
              caption: '',
            };
            uploadedFiles.push(newFile);
            activeFileIndex = uploadedFiles.length - 1;
            caption = '';
            if (nameInput) profileName = nameInput.value;
            if (handleInput) userHandle = handleInput.value.trim();
            render();
            setTimeout(() => {
              modalEl.querySelector('.input-caption')?.focus();
            }, 50);
          };
          reader.readAsDataURL(file);
        }
      });

      // Delete uploaded file
      modalEl.querySelectorAll('.status-tile-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const delId = btn.dataset.id;
          uploadedFiles = uploadedFiles.filter(f => f.id !== delId);
          if (activeFileIndex >= uploadedFiles.length) {
            activeFileIndex = uploadedFiles.length - 1;
          }
          caption = activeFileIndex >= 0 ? (uploadedFiles[activeFileIndex].caption || '') : '';
          if (nameInput) profileName = nameInput.value;
          if (handleInput) userHandle = handleInput.value.trim();
          render();
        });
      });

      // Back to Step 1
      modalEl.querySelector('.btn-back-to-step1')?.addEventListener('click', () => {
        currentStep = 1;
        render();
      });

      // Advance to Step 3 (Pagamento)
      const form = modalEl.querySelector('.status-publish-form');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        profileName = nameInput ? nameInput.value.trim() || 'Anunciante' : 'Anunciante';
        userHandle = handleInput ? handleInput.value.trim() || 'usuario' : 'usuario';

        if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length && captionInput) {
          uploadedFiles[activeFileIndex].caption = captionInput.value.trim();
        }
        caption = captionInput ? captionInput.value.trim() : '';

        if (uploadedFiles.length === 0) {
          uploadError = 'Por favor anexe pelo menos 1 foto para o seu status.';
          render();
          return;
        }

        uploadError = '';
        currentStep = 3; // Advance to Pagamento!
        render();
      });
    }

    // ── Events Step 3: Pagamento Asaas (Fricção Mínima) ───────
    else if (currentStep === 3) {
      const cpfInput = modalEl.querySelector('.input-customer-cpf');

      cpfInput?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 14);
        if (v.length > 11) {
          v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        } else {
          v = v.replace(/(\d{3})(\d)/, '$1.$2')
               .replace(/(\d{3})(\d)/, '$1.$2')
               .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = v;
        customerCpf = v;
      });

      // Mount Stripe Wallet Button (Apple Pay, Google Pay, Link) if device supports it
      const walletEl = modalEl.querySelector('.stripe-wallet-section');
      if (walletEl) {
        mountWalletButton({
          containerEl: walletEl,
          amount: pricing.finalTotal,
          label: `VorcaroZap - ${selectedPlan === 'status_impulsionado' ? 'Status Impulsionado' : 'Status Normal'}`,
          customerName: profileName,
          type: 'status',
          planType: selectedPlan,
          fileCount: uploadedFiles.length || fileCount,
          onPaymentSuccess: (data) => {
            stopPolling();
            paymentApproved = true;
            asaasPaymentId = data.paymentId;
            currentStep = 4;
            render();
          },
          onPaymentError: (err) => {
            paymentError = err.message || 'Falha ao processar pagamento pela carteira digital.';
            render();
          },
        });
      }

      // Listeners para os botões das Formas de Pagamento (Apple Pay, Google Pay, Pix, Link)
      modalEl.querySelectorAll('.wallet-buttons-stack button').forEach(btn => {
        btn.addEventListener('click', async () => {
          const walletType = btn.dataset.wallet;
          processingWallet = walletType;
          paymentError = '';
          render();

          // Fluxo Pix
          if (walletType === 'pix') {
            try {
              const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: statusRecordId,
                  type: 'status',
                  billingType: 'PIX',
                  plan_type: selectedPlan,
                  file_count: uploadedFiles.length || fileCount,
                  profile_name: profileName,
                  user_handle: userHandle,
                  social_network: selectedNetwork,
                  customer: {
                    name: profileName || 'Anunciante VorcaroZap',
                    cpfCnpj: customerCpf || '000.000.000-00',
                  },
                }),
              });

              const data = await res.json();
              processingWallet = null;

              if (!res.ok || !data.ok) {
                paymentError = data.error || 'Não foi possível gerar a cobrança Pix.';
                render();
                return;
              }

              pixData = data.pix;
              render();
              if (data.paymentId) {
                startPaymentPolling(data.paymentId, statusRecordId);
              }
            } catch (err) {
              processingWallet = null;
              paymentError = 'Erro ao gerar Pix: ' + err.message;
              render();
            }
            return;
          }

          // Fluxo Carteiras Digitais (Apple Pay, Google Pay, Link)
          try {
            const res = await fetch('/api/payment/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: statusRecordId,
                type: 'status',
                billingType: 'WALLET',
                walletType,
                plan_type: selectedPlan,
                file_count: uploadedFiles.length || fileCount,
                profile_name: profileName,
                user_handle: userHandle,
                social_network: selectedNetwork,
                customer: {
                  name: profileName || 'Anunciante VorcaroZap',
                },
              }),
            });

            const data = await res.json();
            processingWallet = null;

            if (!res.ok || !data.ok) {
              paymentError = data.error || 'Não foi possível processar o pagamento com a carteira digital.';
              render();
              return;
            }

            if (data.checkoutUrl) {
              try {
                localStorage.setItem('vorcarozap:draft_story', JSON.stringify({
                  id: statusRecordId,
                  plan_type: selectedPlan,
                  file_count: uploadedFiles.length || fileCount,
                  unit_price: pricing.unitPrice,
                  discount_amount: pricing.discountAmount,
                  total_price: pricing.finalTotal,
                  profile_name: profileName || 'Anunciante Parceiro',
                  user_handle: userHandle ? (userHandle.startsWith('@') ? userHandle : `@${userHandle}`) : '@user',
                  social_network: selectedNetwork,
                  caption,
                  profile_pic: profilePicData || null,
                  media_files: uploadedFiles,
                }));
              } catch {}
              window.location.href = data.checkoutUrl;
              return;
            }

            if (data.paymentStatus === 'approved') {
              asaasPaymentId = data.paymentId;
              paymentApproved = true;
              currentStep = 4; // Advance to Preview!
              render();
            }
          } catch (err) {
            processingWallet = null;
            paymentError = 'Erro ao conectar com o gateway de pagamento: ' + err.message;
            render();
          }
        });
      });

      modalEl.querySelector('.btn-copy-pix')?.addEventListener('click', async (e) => {
        if (pixData?.payload) {
          await copyText(pixData.payload);
          const btn = e.currentTarget;
          const origText = btn.textContent;
          btn.textContent = 'Copiado! ✓';
          setTimeout(() => { btn.textContent = origText; }, 2000);
        }
      });

      modalEl.querySelector('.btn-back-to-step2')?.addEventListener('click', () => {
        stopPolling();
        currentStep = 2; // Return to Edição!
        render();
      });
    }

    // ── Events Step 4: Preview e Publicação Final ─────────────
    else if (currentStep === 4) {
      const mediaList = uploadedFiles.length > 0 ? uploadedFiles : [];

      modalEl.querySelector('.status-preview-nav.prev')?.addEventListener('click', () => {
        if (previewActiveIdx > 0) {
          previewActiveIdx--;
          render();
        }
      });

      modalEl.querySelector('.status-preview-nav.next')?.addEventListener('click', () => {
        if (previewActiveIdx < mediaList.length - 1) {
          previewActiveIdx++;
          render();
        }
      });

      modalEl.querySelector('.btn-back-to-edit')?.addEventListener('click', () => {
        currentStep = 2; // Return to Edição
        render();
      });

      modalEl.querySelector('.btn-confirm-publish')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Publicando seu Status...';

        const finalHandle = userHandle.startsWith('@') ? userHandle : `@${userHandle}`;
        const finalLink = buildSocialLink(selectedNetwork, userHandle);

        try {
          const published = await createStatusPurchase({
            id: statusRecordId,
            plan_type: selectedPlan,
            file_count: uploadedFiles.length,
            unit_price: pricing.unitPrice,
            discount_amount: pricing.discountAmount,
            total_price: pricing.finalTotal,
            payment_status: 'approved',
            payment_id: asaasPaymentId,
            profile_name: profileName || 'Anunciante Parceiro',
            user_handle: finalHandle,
            social_network: selectedNetwork,
            social_link: finalLink,
            caption: caption,
            profile_pic: profilePicData || null,
            media_files: uploadedFiles,
          });

          closeModal();

          if (onPublished) {
            onPublished(published);
          }
        } catch (err) {
          console.error('Falha ao gravar no PostgreSQL', err);
          closeModal();
        }
      });
    }
  }

  document.body.appendChild(modalEl);
  document.addEventListener('keydown', handleKey);
  render();
  requestAnimationFrame(() => modalEl.classList.add('open'));
}
