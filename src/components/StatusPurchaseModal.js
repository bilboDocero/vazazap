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
  let selectedBillingType = 'PIX';
  let customerCpf = '';
  let asaasPaymentId = null;
  let statusRecordId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let pixData = null;
  let isProcessingPayment = false;
  let paymentError = '';
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
            <small style="color: #64748B; font-size: 11px; margin-top: 2px;">Exigido pelo Banco Central para registro fiscal do Pix/cobrança.</small>
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

      // Gerar Pix (Fricção mínima)
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
