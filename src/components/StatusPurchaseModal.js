/**
 * StatusPurchaseModal component — handles the purchase flow and publication
 * of a Status (Normal or Impulsionado) with Asaas real payment integration
 * (PIX QR Code / Copia e Cola & Cartão de Crédito) and PostgreSQL persistence.
 *
 * Flow: 1. Plano -> 2. Edição -> 3. Pagamento -> 4. Preview
 */

import {
  SOCIAL_NETWORKS,
  calculateStatusPrice,
  buildSocialLink,
  createStatusPurchase,
} from '../lib/status-db.js';
import { escapeHtml, sanitizeUrl, escapeAttr, copyText } from '../lib/utils.js';

const ICON_CHECK_CIRCLE = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none"><circle cx="12" cy="12" r="11" fill="#00A884"/><path d="M7 12.5l3.5 3.5 7-7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PLUS_SIGN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>`;
const ICON_BACK_ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const ICON_PIX = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.001 2.002a2.4 2.4 0 0 0-1.698.703L6.035 7.01a2.4 2.4 0 0 0 0 3.395l4.268 4.268a2.4 2.4 0 0 0 3.395 0l4.268-4.268a2.4 2.4 0 0 0 0-3.395L13.7 2.705a2.4 2.4 0 0 0-1.699-.703zm-5.966 9.362a2.4 2.4 0 0 0-1.698.703L2.705 13.7a2.4 2.4 0 0 0 0 3.395l4.268 4.268a2.4 2.4 0 0 0 3.395 0l1.633-1.633-4.268-4.268a2.4 2.4 0 0 1 0-3.395l1.633-1.633zm11.932 0-1.633 1.633a2.4 2.4 0 0 1 0 3.395l4.268 4.268 1.633-1.633a2.4 2.4 0 0 0 0-3.395l-4.268-4.268a2.4 2.4 0 0 0-1.699-.703z"/></svg>`;
const ICON_CARD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;

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
  let selectedBillingType = 'PIX'; // 'PIX' | 'CREDIT_CARD'
  let customerCpf = '';
  let asaasPaymentId = null;
  let statusRecordId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let pixData = null; // { encodedImage, payload, expirationDate }
  let isProcessingPayment = false;
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
          paymentApproved = true;
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
            <span class="status-step-pill ${currentStep >= 1 ? 'active' : ''}">1. Plano</span>
            <span class="status-step-pill ${currentStep >= 2 ? 'active' : ''}">2. Edição</span>
            <span class="status-step-pill ${currentStep >= 3 ? 'active' : ''}">3. Pagamento</span>
            <span class="status-step-pill ${currentStep >= 4 ? 'active' : ''}">4. Preview</span>
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
                <p class="status-plan-text">Veiculação de 24 horas no acervo, suporte a até 4 arquivos com desconto progressivo.</p>
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

    // ── STEP 2: Edição do Story (Foto, Nome, @User, Mídias) ──
    if (currentStep === 2) {
      const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
      const activeFile = (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length)
        ? uploadedFiles[activeFileIndex]
        : null;
      const currentCaption = activeFile ? (activeFile.caption || '') : (caption || '');

      return `
        <div class="status-step-upload">
          <h2 class="status-modal-title">Configurar seu Story</h2>
          <p class="status-modal-desc">Informe seu nome ou marca, seu @usuário e selecione até ${fileCount} foto${fileCount > 1 ? 's' : ''}.</p>

          <form class="status-publish-form">
            <div class="status-profile-section">
              <div class="status-avatar-upload-box">
                <div class="status-avatar-preview">
                  ${profilePicData
                    ? `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" class="status-avatar-img" />`
                    : `<div class="status-avatar-placeholder">${ICON_CAMERA}</div>`
                  }
                </div>
                <label class="status-avatar-btn">
                  <span>${profilePicData ? 'Alterar foto' : 'Enviar foto'}</span>
                  <input type="file" class="input-profile-pic" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                </label>
              </div>

              <div class="status-names-group">
                <label class="status-field-label">
                  <span>Nome da Marca / Anunciante:</span>
                  <input type="text" class="status-text-input input-profile-name" placeholder="Ex: Loja do Vorcaro" value="${escapeAttr(profileName)}" maxlength="60" required />
                </label>

                <div class="status-social-pick">
                  <div class="status-social-networks">
                    ${Object.entries(SOCIAL_NETWORKS).map(([key, net]) => `
                      <button type="button" class="status-network-btn ${selectedNetwork === key ? 'active' : ''}" data-net="${key}" title="${net.name}">
                        ${net.icon}
                      </button>
                    `).join('')}
                  </div>
                  <input type="text" class="status-text-input input-user-handle" placeholder="@seu.perfil" value="${escapeAttr(userHandle)}" maxlength="40" required />
                </div>
              </div>
            </div>

            <div class="status-link-preview-box">
              <span class="status-link-preview-label">Link de destino do Story:</span>
              <span class="status-link-preview-url"></span>
            </div>

            <div class="status-media-upload-section">
              <div class="status-media-header">
                <label class="status-field-label">
                  <span>Fotos do Story (${uploadedFiles.length} de ${fileCount} anexadas)</span>
                  <small class="status-media-hint">Formato 9:16 vertical (JPG, PNG ou WEBP). Vídeos não são permitidos.</small>
                </label>
              </div>

              <div class="status-uploaded-grid">
                ${uploadedFiles.map((f, i) => `
                  <div class="status-uploaded-tile ${i === activeFileIndex ? 'selected' : ''}" data-id="${f.id}" title="Clique para editar a legenda desta imagem">
                    <img src="${sanitizeUrl(f.url, true)}" alt="${escapeHtml(f.name)}" />
                    <button type="button" class="status-tile-delete-btn" data-id="${f.id}" aria-label="Remover">&times;</button>
                    <span class="status-tile-order-badge">${i + 1}</span>
                  </div>
                `).join('')}

                ${uploadedFiles.length < fileCount ? `
                  <label class="status-tile-add-btn">
                    <input type="file" class="input-media-file" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                    ${ICON_PLUS_SIGN}
                    <span>Anexar foto ${uploadedFiles.length + 1}</span>
                  </label>
                ` : ''}
              </div>

              ${uploadError ? `<div class="status-upload-error">${escapeHtml(uploadError)}</div>` : ''}

              <div class="status-caption-box-wrapper">
                <label class="status-field-label">
                  <span>${activeFile ? `Legenda do arquivo #${activeFileIndex + 1} (${escapeHtml(activeFile.name)})` : 'Legenda do Story (opcional)'}:</span>
                </label>
                <textarea class="status-textarea input-caption" placeholder="Escreva a legenda que aparecerá no rodapé do Story..." rows="2" maxlength="300">${escapeHtml(currentCaption)}</textarea>
              </div>
            </div>

            <div class="status-form-actions">
              <button type="button" class="status-btn-primary btn-advance-to-payment">
                Avançar para Pagamento (${pricing.formattedTotal}) &rarr;
              </button>
              <button type="button" class="btn-back-to-step1" style="margin-top: 10px; width: 100%; border: 0; background: transparent; color: #64748B; font-size: 13px; cursor: pointer; text-decoration: underline;">
                &larr; Voltar para escolha do plano
              </button>
            </div>
          </form>
        </div>
      `;
    }

    // ── STEP 3: Pagamento com Fricção Mínima (Nome já herdado) ─
    if (currentStep === 3) {
      return `
        <div class="status-step-payment" style="text-align: left; width: 100%;">
          <h2 class="status-modal-title" style="text-align: center;">Pagamento Seguro via Asaas</h2>
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

          <!-- Tabs PIX / Cartão -->
          <div class="payment-method-selector">
            <button type="button" class="payment-method-tab ${selectedBillingType === 'PIX' ? 'active' : ''}" data-type="PIX">
              ${ICON_PIX}
              <span>PIX (Instantâneo)</span>
            </button>
            <button type="button" class="payment-method-tab ${selectedBillingType === 'CREDIT_CARD' ? 'active' : ''}" data-type="CREDIT_CARD">
              ${ICON_CARD}
              <span>Cartão de Crédito</span>
            </button>
          </div>

          <!-- CPF único obrigatório para emissão -->
          <div class="payment-input-group" style="margin-bottom: 14px;">
            <label class="payment-input-label">CPF ou CNPJ para Faturamento</label>
            <input type="text" class="payment-input-field input-customer-cpf" placeholder="000.000.000-00" value="${escapeAttr(customerCpf)}" maxlength="18" required />
            <small style="color: #64748B; font-size: 11px; margin-top: 2px;">Exigido pelo Banco Central para registro do Pix/cobrança no Asaas.</small>
          </div>

          ${selectedBillingType === 'PIX' ? `
            <!-- Fluxo PIX: Fricção Mínima! -->
            ${pixData ? `
              <div class="pix-qr-container">
                <span style="font-size: 13px; font-weight: 600; color: #111B21;">Escaneie o QR Code abaixo no app do seu banco:</span>
                <img src="data:image/png;base64,${pixData.encodedImage}" alt="QR Code PIX" class="pix-qr-img" />

                <div class="pix-waiting-box">
                  <span class="pix-pulse-dot"></span>
                  <span>Aguardando confirmação do pagamento...</span>
                </div>

                <span style="font-size: 12px; color: #64748B;">Ou copie o código Pix Copia e Cola:</span>
                <div class="pix-copia-cola-box">
                  <input type="text" readonly class="pix-copia-cola-input" value="${escapeAttr(pixData.payload)}" />
                  <button type="button" class="pix-copy-btn btn-copy-pix">Copiar Código</button>
                </div>
              </div>
            ` : `
              <button type="button" class="status-btn-primary btn-generate-pix" ${isProcessingPayment ? 'disabled' : ''}>
                ${isProcessingPayment ? 'Gerando QR Code no Asaas...' : `Gerar QR Code Pix (${pricing.formattedTotal})`}
              </button>
            `}
          ` : `
            <!-- Fluxo Cartão de Crédito -->
            <div class="payment-grid-2">
              <div class="payment-input-group">
                <label class="payment-input-label">Número do Cartão</label>
                <input type="text" class="payment-input-field input-card-number" placeholder="0000 0000 0000 0000" value="${escapeAttr(cardNumber)}" maxlength="19" />
              </div>
              <div class="payment-input-group">
                <label class="payment-input-label">Nome no Cartão</label>
                <input type="text" class="payment-input-field input-card-holder" placeholder="COMO NO CARTÃO" value="${escapeAttr(cardHolderName || profileName)}" />
              </div>
            </div>

            <div class="payment-grid-2">
              <div class="payment-input-group">
                <label class="payment-input-label">Validade (MM/AA)</label>
                <input type="text" class="payment-input-field input-card-expiry" placeholder="12/28" value="${escapeAttr(cardExpiry)}" maxlength="5" />
              </div>
              <div class="payment-input-group">
                <label class="payment-input-label">CVV</label>
                <input type="text" class="payment-input-field input-card-ccv" placeholder="123" value="${escapeAttr(cardCcv)}" maxlength="4" />
              </div>
            </div>

            <div class="payment-grid-2">
              <div class="payment-input-group">
                <label class="payment-input-label">CEP</label>
                <input type="text" class="payment-input-field input-card-cep" placeholder="01001-000" value="${escapeAttr(cardCep)}" maxlength="9" />
              </div>
              <div class="payment-input-group">
                <label class="payment-input-label">Número</label>
                <input type="text" class="payment-input-field input-card-num" placeholder="123" value="${escapeAttr(cardAddressNumber)}" />
              </div>
            </div>

            <button type="button" class="status-btn-primary btn-pay-card" ${isProcessingPayment ? 'disabled' : ''}>
              ${isProcessingPayment ? 'Processando transação com operadora...' : `Pagar com Cartão (${pricing.formattedTotal})`}
            </button>
          `}

          <button type="button" class="btn-back-to-step2" style="margin-top: 14px; width: 100%; border: 0; background: transparent; color: #64748B; font-size: 13px; cursor: pointer; text-decoration: underline;">
            &larr; Voltar para edição do story
          </button>
        </div>
      `;
    }

    // ── STEP 4: Pré-visualização e Publicação ─────────────────
    if (currentStep === 4) {
      const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
      const mediaList = uploadedFiles.length > 0 ? uploadedFiles : [];
      const activeMedia = mediaList[previewActiveIdx] || { name: 'Foto', url: '', caption: caption };
      const activeCaption = activeMedia.caption || caption || '';

      return `
        <div class="status-step-preview">
          <div style="text-align: center; margin-bottom: 8px;">
            <span style="display: inline-block; padding: 4px 12px; background: #DCFCE7; color: #15803D; border-radius: 12px; font-size: 12px; font-weight: 700;">
              ✓ Pagamento Confirmado
            </span>
          </div>

          <div class="status-preview-top-bar">
            <button type="button" class="status-preview-back-btn btn-back-to-edit">
              ${ICON_BACK_ARROW}
              <span>Ajustar Edição</span>
            </button>
            <span class="status-preview-step-title">Pré-visualização do Story (${previewActiveIdx + 1} de ${mediaList.length})</span>
          </div>

          <div class="status-preview-phone-mockup">
            <div class="story-progress-bar">
              ${mediaList.map((_, idx) => `
                <div class="story-progress-seg ${idx === previewActiveIdx ? 'active' : (idx < previewActiveIdx ? 'passed' : '')}"></div>
              `).join('')}
            </div>

            <header class="story-header">
              <div class="story-header-user">
                <div class="story-header-avatar">
                  ${profilePicData
                    ? `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" />`
                    : defaultAvatarSvg('preview')
                  }
                </div>
                <div>
                  <div class="story-header-name">
                    ${escapeHtml(profileName || 'Anunciante')}
                    ${selectedPlan === 'status_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
                  </div>
                  <div class="story-header-meta">${escapeHtml(userHandle || '@user')} · ${escapeHtml(network.name)}</div>
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

          <div class="status-preview-actions">
            <button type="button" class="status-btn-secondary status-btn-edit-preview">
              Editar Dados e Fotos
            </button>
            <button type="button" class="status-btn-primary btn-confirm-publish">
              Confirmar e Publicar Agora
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  function wireEvents(pricing) {
    modalEl.querySelector('.status-modal-close')?.addEventListener('click', closeModal);

    // ── Events Step 1: Plano ──────────────────────────────────
    if (currentStep === 1) {
      modalEl.querySelectorAll('input[name="plan"]').forEach(input => {
        input.addEventListener('change', (e) => {
          selectedPlan = e.target.value;
          render();
        });
      });

      modalEl.querySelectorAll('.status-file-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          fileCount = parseInt(btn.dataset.count, 10);
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

    // ── Events Step 2: Edição ─────────────────────────────────
    else if (currentStep === 2) {
      const handleInput = modalEl.querySelector('.input-user-handle');
      const nameInput = modalEl.querySelector('.input-profile-name');
      const captionInput = modalEl.querySelector('.input-caption');
      const profilePicInput = modalEl.querySelector('.input-profile-pic');
      const mediaInput = modalEl.querySelector('.input-media-file');
      const linkPreviewEl = modalEl.querySelector('.status-link-preview-url');

      function updateLink() {
        if (linkPreviewEl && handleInput) {
          const raw = handleInput.value.trim();
          linkPreviewEl.textContent = buildSocialLink(selectedNetwork, raw);
        }
      }

      handleInput?.addEventListener('input', () => {
        userHandle = handleInput.value.trim();
        updateLink();
      });

      nameInput?.addEventListener('input', () => { profileName = nameInput.value; });

      captionInput?.addEventListener('input', () => {
        const val = captionInput.value;
        caption = val;
        if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length) {
          uploadedFiles[activeFileIndex].caption = val;
        }
      });

      updateLink();

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

      modalEl.querySelectorAll('.status-network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedNetwork = btn.dataset.net;
          profileName = nameInput.value;
          userHandle = handleInput.value.trim();
          if (captionInput && activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length) {
            uploadedFiles[activeFileIndex].caption = captionInput.value;
          }
          caption = captionInput ? captionInput.value : '';
          render();
        });
      });

      profilePicInput?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.type && !file.type.startsWith('image/')) {
          uploadError = 'Vídeos não são aceitos. Por favor envie uma imagem (JPG, PNG ou WEBP).';
          render();
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          uploadError = `A foto de perfil excede o tamanho máximo de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
          render();
          return;
        }

        uploadError = '';
        const reader = new FileReader();
        reader.onload = (ev) => {
          profilePicData = ev.target.result;
          const preview = modalEl.querySelector('.status-avatar-preview');
          if (preview) {
            preview.innerHTML = `<img src="${sanitizeUrl(profilePicData, true)}" alt="Avatar" class="status-avatar-img" />`;
          }
        };
        reader.readAsDataURL(file);
      });

      mediaInput?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.type && !file.type.startsWith('image/')) {
          uploadError = 'Vídeos não são aceitos nesta plataforma. Por favor envie apenas fotos (JPG, PNG ou WEBP).';
          render();
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          uploadError = `O arquivo selecionado (${file.name}) ultrapassa o limite de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
          render();
          return;
        }

        if (uploadedFiles.length >= fileCount) {
          uploadError = `Seu plano permite no máximo ${fileCount} arquivo${fileCount > 1 ? 's' : ''}.`;
          render();
          return;
        }

        uploadError = '';
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newFile = {
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            url: ev.target.result,
            type: file.type || 'image/jpeg',
            caption: '',
          };

          uploadedFiles.push(newFile);
          activeFileIndex = uploadedFiles.length - 1;
          caption = '';

          render();
        };
        reader.readAsDataURL(file);
      });

      modalEl.querySelectorAll('.status-tile-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const fileId = btn.dataset.id;
          uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
          activeFileIndex = uploadedFiles.length - 1;
          caption = activeFileIndex >= 0 ? (uploadedFiles[activeFileIndex].caption || '') : '';
          render();
        });
      });

      modalEl.querySelector('.btn-advance-to-payment')?.addEventListener('click', () => {
        if (!profileName.trim()) {
          uploadError = 'Por favor informe o Nome da Marca ou Anunciante.';
          render();
          return;
        }
        if (!userHandle.trim()) {
          uploadError = 'Por favor informe seu @usuário da rede social.';
          render();
          return;
        }
        if (uploadedFiles.length === 0) {
          uploadError = 'Por favor anexe pelo menos 1 foto para o seu Story.';
          render();
          return;
        }
        uploadError = '';
        currentStep = 3; // Advance to Pagamento!
        render();
      });

      modalEl.querySelector('.btn-back-to-step1')?.addEventListener('click', () => {
        currentStep = 1;
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

      // Switch tab PIX / Cartão
      modalEl.querySelectorAll('.payment-method-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          selectedBillingType = tab.dataset.type;
          paymentError = '';
          stopPolling();
          pixData = null;
          render();
        });
      });

      // Gerar Pix (Fricção mínima: nome e handle já herdados da edição!)
      modalEl.querySelector('.btn-generate-pix')?.addEventListener('click', async () => {
        if (customerCpf.replace(/\D/g, '').length < 11) {
          paymentError = 'Por favor informe um CPF ou CNPJ válido.';
          render();
          return;
        }

        isProcessingPayment = true;
        paymentError = '';
        render();

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
                cpfCnpj: customerCpf,
              },
            }),
          });

          const data = await res.json();
          isProcessingPayment = false;

          if (!res.ok || !data.ok) {
            paymentError = data.error || 'Não foi possível gerar a cobrança Pix no Asaas.';
            render();
            return;
          }

          asaasPaymentId = data.paymentId;
          pixData = data.pix;
          render();

          // Inicia polling de verificação automática
          startPaymentPolling(data.paymentId, statusRecordId);
        } catch (err) {
          isProcessingPayment = false;
          paymentError = 'Erro de conexão com o servidor de pagamentos: ' + err.message;
          render();
        }
      });

      // Copiar código Pix
      modalEl.querySelector('.btn-copy-pix')?.addEventListener('click', async (e) => {
        if (pixData?.payload) {
          await copyText(pixData.payload);
          const btn = e.currentTarget;
          const origText = btn.textContent;
          btn.textContent = 'Copiado! ✓';
          setTimeout(() => { btn.textContent = origText; }, 2000);
        }
      });

      // Cartão de Crédito
      const cardNumInput = modalEl.querySelector('.input-card-number');
      const cardHolderInput = modalEl.querySelector('.input-card-holder');
      const cardExpInput = modalEl.querySelector('.input-card-expiry');
      const cardCcvInput = modalEl.querySelector('.input-card-ccv');
      const cardCepInput = modalEl.querySelector('.input-card-cep');
      const cardNumResInput = modalEl.querySelector('.input-card-num');

      cardNumInput?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 16);
        v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = v;
        cardNumber = v;
      });

      cardHolderInput?.addEventListener('input', e => { cardHolderName = e.target.value.toUpperCase(); });

      cardExpInput?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (v.length >= 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
        e.target.value = v;
        cardExpiry = v;
      });

      cardCcvInput?.addEventListener('input', e => {
        cardCcv = e.target.value.replace(/\D/g, '').slice(0, 4);
        e.target.value = cardCcv;
      });

      cardCepInput?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 8);
        if (v.length >= 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
        e.target.value = v;
        cardCep = v;
      });

      cardNumResInput?.addEventListener('input', e => { cardAddressNumber = e.target.value; });

      // Pagar Cartão
      modalEl.querySelector('.btn-pay-card')?.addEventListener('click', async () => {
        if (customerCpf.replace(/\D/g, '').length < 11) {
          paymentError = 'Informe um CPF válido para o titular do cartão.';
          render();
          return;
        }
        if (cardNumber.replace(/\D/g, '').length < 15) {
          paymentError = 'Informe um número de cartão de crédito válido.';
          render();
          return;
        }
        const holder = cardHolderName.trim() || profileName.trim();
        if (!holder) {
          paymentError = 'Informe o nome impresso no cartão.';
          render();
          return;
        }
        if (!cardExpiry.includes('/') || cardExpiry.replace(/\D/g, '').length < 4) {
          paymentError = 'Validade do cartão inválida (formato MM/AA).';
          render();
          return;
        }
        if (cardCcv.length < 3) {
          paymentError = 'Código de segurança (CVV) inválido.';
          render();
          return;
        }

        const [expMonth, expYear] = cardExpiry.split('/');
        isProcessingPayment = true;
        paymentError = '';
        render();

        try {
          const res = await fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: statusRecordId,
              type: 'status',
              billingType: 'CREDIT_CARD',
              plan_type: selectedPlan,
              file_count: uploadedFiles.length || fileCount,
              profile_name: profileName,
              user_handle: userHandle,
              social_network: selectedNetwork,
              customer: {
                name: profileName || holder,
                cpfCnpj: customerCpf,
              },
              creditCard: {
                holderName: holder,
                number: cardNumber,
                expiryMonth: expMonth.trim(),
                expiryYear: expYear.trim(),
                ccv: cardCcv.trim(),
              },
              creditCardHolderInfo: {
                name: holder,
                cpfCnpj: customerCpf,
                postalCode: cardCep || '01001-000',
                addressNumber: cardAddressNumber || '1',
              },
            }),
          });

          const data = await res.json();
          isProcessingPayment = false;

          if (!res.ok || !data.ok) {
            paymentError = data.error || 'Cartão recusado pela operadora. Verifique os dados ou utilize o Pix.';
            render();
            return;
          }

          asaasPaymentId = data.paymentId;
          paymentApproved = true;
          currentStep = 4; // Advance to Preview!
          render();
        } catch (err) {
          isProcessingPayment = false;
          paymentError = 'Falha ao processar pagamento com cartão: ' + err.message;
          render();
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

      modalEl.querySelector('.status-btn-edit-preview')?.addEventListener('click', () => {
        currentStep = 2; // Return to Edição
        render();
      });

      modalEl.querySelector('.btn-confirm-publish')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Publicando seu Story...';

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
