import { checkoutIdentity, startCheckout } from '../lib/checkout.js';
/** Purchase flow: plan, content, review, secure Stripe Checkout. */

import {
  SOCIAL_NETWORKS,
  calculateVitrinePrice,
  buildSocialLink,
} from '../lib/vitrine-db.js';
import { escapeHtml, sanitizeUrl, escapeAttr, processAvatarImage } from '../lib/utils.js';

const ICON_PLUS_SIGN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>`;
const ICON_BACK_ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const ICON_PIX = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"/></svg>`;
const ICON_CARD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max per attachment

export function openVitrinePurchaseModal({ onPublished, initialPlan = 'vitrine_normal' } = {}) {
  let modalEl = document.querySelector('.status-modal-overlay');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'status-modal-overlay';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', 'Contratar Vitrine Comercial');

  // State: Standardized sequence [1. Plano -> 2. Edição -> 3. Pagamento -> 4. Preview]
  let currentStep = 1;
  let selectedPlan = initialPlan;
  let fileCount = 1;

  // Content & Profile State (captured in Step 2: Edição)
  let profilePicData = '';
  let profileName = '';
  let userHandle = '';
  let caption = '';
  let uploadedFiles = [];
  let activeFileIndex = -1;
  let selectedNetwork = 'instagram';
  let previewActiveIdx = 0;
  let uploadError = '';

  const identity = checkoutIdentity();
  let processingWallet = null;
  let paymentError = '';

  function closeModal() {
    modalEl.classList.remove('open');
    setTimeout(() => modalEl.remove(), 200);
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function render() {
    const pricing = calculateVitrinePrice({ planType: selectedPlan, fileCount });

    modalEl.innerHTML = `
      <div class="status-modal-dialog">
        <header class="status-modal-header">
          <div class="status-modal-steps">
            <span class="status-step-pill ${currentStep >= 1 ? 'active' : ''}">Plano</span>
            <span class="status-step-pill ${currentStep >= 2 ? 'active' : ''}">Edição</span>
            <span class="status-step-pill ${currentStep === 4 || currentStep === 3 ? 'active' : ''}">Revisão</span>
            <span class="status-step-pill ${currentStep === 3 ? 'active' : ''}">Pagamento</span>
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
    // ── STEP 1: Escolha do Plano da Vitrine ───────────────────
    if (currentStep === 1) {
      return `
        <div class="status-step-plan">
          <h2 class="status-modal-title">Escolha seu Plano de Vitrine</h2>
          <p class="status-modal-desc">Cadastre e exiba seus produtos ou catálogo comercial no ecossistema VorcaroZap com link direto.</p>

          <div class="status-plans-selector">
            <label class="status-plan-card ${selectedPlan === 'vitrine_normal' ? 'selected' : ''}">
              <input type="radio" name="plan" value="vitrine_normal" ${selectedPlan === 'vitrine_normal' ? 'checked' : ''} />
              <div class="status-plan-info">
                <div class="status-plan-top">
                  <span class="status-plan-name">Vitrine Padrão</span>
                  <span class="status-plan-price">R$ 4,90 <small>/item</small></span>
                </div>
                <p class="status-plan-text">Exibição de produtos na aba Vitrine com até 4 fotos e link para sua loja.</p>
              </div>
            </label>

            <label class="status-plan-card ${selectedPlan === 'vitrine_impulsionado' ? 'selected' : ''}">
              <input type="radio" name="plan" value="vitrine_impulsionado" ${selectedPlan === 'vitrine_impulsionado' ? 'checked' : ''} />
              <div class="status-plan-info">
                <div class="status-plan-top">
                  <span class="status-plan-name">Vitrine Impulsionada</span>
                  <span class="status-plan-price">R$ 149,00 <small>/item</small></span>
                </div>
                <p class="status-plan-text">Destaque comercial no topo da Vitrine com badge PRO e maior conversão de vendas.</p>
              </div>
            </label>
          </div>

          <div class="status-files-selector-group">
            <label class="status-files-label">
              <span>Quantidade de fotos do produto:</span>
              <span class="status-files-count-badge">${fileCount} foto${fileCount > 1 ? 's' : ''}</span>
            </label>
            <div class="status-files-buttons">
              ${[1, 2, 3, 4].map(n => `
                <button type="button" class="status-file-btn ${fileCount === n ? 'active' : ''}" data-count="${n}">
                  ${n} ${n === 1 ? 'foto' : 'fotos'}
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

    // ── STEP 2: Edição da Vitrine (Design Original Preservado) ─
    if (currentStep === 2) {
      const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
      const activeFile = (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length)
        ? uploadedFiles[activeFileIndex]
        : null;
      const currentCaption = activeFile ? (activeFile.caption || '') : (caption || '');

      return `
        <div class="status-step-upload">
          <h2 class="status-modal-title">Configurar sua Vitrine</h2>
          <p class="status-modal-desc">Cadastre a foto da sua loja, o nome do produto/marca e as fotos da sua vitrine.</p>

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
                  <span>Nome da vitrine ou empresa</span>
                  <input type="text" class="input-profile-name" value="${escapeHtml(profileName)}" placeholder="Ex: Master Store ou Relógios & Cia" required />
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
                <div class="status-guidance-badge">📐 Dimensões Ideais</div>
                <p>Recomendamos imagens verticais na proporção <strong>9:16 (1080 × 1920 px)</strong> para preencher toda a tela da vitrine sem faixas. Vídeos não são aceitos no momento (máx. <strong>5 MB</strong> por anexo).</p>
              </div>

              <label class="status-field-label">
                <span>Produtos da Vitrine (${uploadedFiles.length} de ${fileCount} contratados)</span>
              </label>

              ${uploadError ? `<div class="status-upload-error-msg" role="alert">${escapeHtml(uploadError)}</div>` : ''}

              <div class="status-files-dropzone">
                ${uploadedFiles.map((file, idx) => `
                  <div class="status-uploaded-tile ${idx === activeFileIndex ? 'selected' : ''}" data-id="${file.id}" role="button" tabindex="0" title="Clique para editar a legenda deste produto">
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
              <span>Descrição / Legenda do produto (opcional)</span>
              <textarea class="input-caption" rows="2" placeholder="Digite detalhes ou condições deste produto...">${escapeHtml(currentCaption)}</textarea>
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
          <p class="status-modal-desc" style="text-align: center;">Liberação imediata da sua Vitrine Comercial com verificação automática.</p>

          <div class="status-receipt-box" style="margin-bottom: 16px;">
            <div class="status-receipt-row">
              <span>Vitrine / Loja:</span>
              <strong>${escapeHtml(profileName || 'Loja')} (${escapeHtml(userHandle ? (userHandle.startsWith('@') ? userHandle : '@' + userHandle) : '@loja')})</strong>
            </div>
            <div class="status-receipt-row">
              <span>Plano:</span>
              <strong>${selectedPlan === 'vitrine_impulsionado' ? 'Vitrine Impulsionada' : 'Vitrine Normal'} (${fileCount} foto${fileCount > 1 ? 's' : ''})</strong>
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

          <div class="wallet-buttons-stack">
            <button type="button" class="btn-wallet-pix" data-wallet="pix" ${processingWallet ? 'disabled' : ''}>
              ${ICON_PIX}<span>${processingWallet === 'pix' ? 'Abrindo pagamento…' : 'Pagar com Pix (' + pricing.formattedTotal + ')'}</span>
            </button>
            <button type="button" class="btn-wallet-link" data-wallet="card" ${processingWallet ? 'disabled' : ''}>
              ${ICON_CARD}<span>${processingWallet === 'card' ? 'Abrindo pagamento…' : 'Pagar com cartão (' + pricing.formattedTotal + ')'}</span>
            </button>
          </div>
          <p class="status-modal-desc">Apple Pay e Google Pay aparecem no pagamento com cartão quando disponíveis no seu dispositivo.</p>

          <div class="payment-trust-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Ambiente seguro processado pela Stripe · Liberação imediata após pagamento</span>
          </div>

          <button type="button" class="btn-back-to-step2" style="margin-top: 14px; width: 100%; border: 0; background: transparent; color: #64748B; font-size: 13px; cursor: pointer; text-decoration: underline;">
            &larr; Voltar para edição da vitrine
          </button>
        </div>
      `;
    }

    // ── STEP 4: Pré-visualização da Vitrine (Design Original) ─
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
          <h2 class="status-modal-title">Pré-visualização da Vitrine</h2>
          <p class="status-modal-desc">Confira exatamente como seu produto será exibido na Vitrine antes de seguir para o pagamento. Após a confirmação, a publicação é automática.</p>

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
                      : `<div style="background:#00A884;width:100%;height:100%;display:grid;place-items:center;color:#fff;font-weight:700;">${(profileName || 'V').charAt(0)}</div>`
                    }
                  </div>
                  <div>
                    <div class="story-header-name">
                      ${escapeHtml(profileName || 'Vitrine Comercial')}
                      ${selectedPlan === 'vitrine_impulsionado' ? '<span class="updates-status-badge-boost">Impulsionado</span>' : ''}
                    </div>
                    <div class="story-header-meta">${escapeHtml(userHandle ? (userHandle.startsWith('@') ? userHandle : `@${userHandle}`) : '@vitrine')} · ${network.name}</div>
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
                  <span>Visitar vitrine no ${escapeHtml(network.name)} (${escapeHtml(userHandle || 'loja')}) ↗</span>
                </div>
              </footer>
            </div>
          </div>

          <div class="status-preview-actions-bar">
            <button type="button" class="status-btn-edit-preview btn-back-to-edit">
              &larr; Voltar para editar
            </button>
            <button type="button" class="status-btn-primary btn-confirm-publish">
              Continuar para pagamento
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

    // ── Events Step 2: Edição da Vitrine ──────────────────────
    else if (currentStep === 2) {
      const nameInput = modalEl.querySelector('.input-profile-name');
      const handleInput = modalEl.querySelector('.input-user-handle');
      const linkPreview = modalEl.querySelector('.status-generated-link');
      const captionInput = modalEl.querySelector('.input-caption');
      const profilePicInput = modalEl.querySelector('.input-profile-pic');
      const mediaInput = modalEl.querySelector('.input-media-files');

      function updateLink() {
        const username = handleInput ? handleInput.value.trim() || 'vitrine' : 'vitrine';
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

      modalEl.querySelector('.btn-back-to-step1')?.addEventListener('click', () => {
        currentStep = 1;
        render();
      });

      const form = modalEl.querySelector('.status-publish-form');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        profileName = nameInput ? nameInput.value.trim() || 'Vitrine Comercial' : 'Vitrine Comercial';
        userHandle = handleInput ? handleInput.value.trim() || 'vitrine' : 'vitrine';

        if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length && captionInput) {
          uploadedFiles[activeFileIndex].caption = captionInput.value.trim();
        }
        caption = captionInput ? captionInput.value.trim() : '';

        if (uploadedFiles.length === 0) {
          uploadError = 'Por favor anexe pelo menos 1 foto do seu produto.';
          render();
          return;
        }

        uploadError = '';
        fileCount = uploadedFiles.length;
        currentStep = 4; // Review the exact purchase before payment.
        render();
      });
    }

    // ── Events Step 3: Pagamento no Checkout ───────
    else if (currentStep === 3) {
      modalEl.querySelectorAll('.wallet-buttons-stack button').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (processingWallet) return;
          processingWallet = btn.dataset.wallet;
          paymentError = '';
          render();
          try {
            const result = await startCheckout({
              ...identity, type: 'vitrine', billingType: processingWallet === 'pix' ? 'PIX' : 'CREDIT_CARD',
              plan_type: selectedPlan, file_count: uploadedFiles.length,
              profile_name: profileName, user_handle: userHandle, social_network: selectedNetwork,
              caption, profile_pic: profilePicData, media_files: uploadedFiles,
            });
            if (result.purchase) { closeModal(); onPublished?.(result.purchase); }
            else window.location.assign(result.checkoutUrl);
          } catch (error) { paymentError = error.message; }
          finally { processingWallet = null; if (modalEl.isConnected) render(); }
        });
      });
      modalEl.querySelector('.btn-back-to-step2')?.addEventListener('click', () => {
        if (processingWallet) return;
        currentStep = 2;
        render();
      });
    }

    // ── Events Step 4: Preview e Publicação da Vitrine ────────
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

      modalEl.querySelector('.btn-confirm-publish')?.addEventListener('click', () => {
        currentStep = 3;
        render();
      });
    }
  }

  document.body.appendChild(modalEl);
  document.addEventListener('keydown', handleKey);
  render();
  requestAnimationFrame(() => modalEl.classList.add('open'));
}
