/**
 * StatusPurchaseModal component — handles the purchase flow and publication
 * of a Status (Normal or Impulsionado) with PostgreSQL integration.
 * Includes preview step before approving publication, file size limits,
 * single-attachment picking, and 9:16 dimension guidance.
 */

import {
  SOCIAL_NETWORKS,
  calculateStatusPrice,
  buildSocialLink,
  createStatusPurchase,
} from '../lib/status-db.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_CHECK_CIRCLE = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none"><circle cx="12" cy="12" r="11" fill="#00A884"/><path d="M7 12.5l3.5 3.5 7-7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PLUS_SIGN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm11 16H4V7h3.83l1.83-2h4.68l1.83 2H20v12z"/></svg>`;
const ICON_BACK_ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max per attachment

export function openStatusPurchaseModal({ onPublished, initialPlan = 'status_normal' } = {}) {
  let modalEl = document.querySelector('.status-modal-overlay');
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.className = 'status-modal-overlay';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', 'Contratar Status / Story');

  // State
  let currentStep = 1; // 1: Plano, 2: Pagamento, 3: Publicação, 4: Pré-visualização
  let selectedPlan = initialPlan;
  let fileCount = 1;
  let profilePicData = '';
  let profileName = '';
  let userHandle = '';
  let caption = '';
  let uploadedFiles = []; // array of { id, name, url, type, caption }
  let activeFileIndex = -1; // currently selected attachment for editing its caption
  let selectedNetwork = 'instagram';
  let previewActiveIdx = 0;
  let uploadError = '';

  function closeModal() {
    modalEl.classList.remove('open');
    setTimeout(() => modalEl.remove(), 200);
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function render() {
    const pricing = calculateStatusPrice({ planType: selectedPlan, fileCount });

    modalEl.innerHTML = `
      <div class="status-modal-dialog">
        <header class="status-modal-header">
          <div class="status-modal-steps">
            <span class="status-step-pill ${currentStep >= 1 ? 'active' : ''}">Plano</span>
            <span class="status-step-pill ${currentStep >= 2 ? 'active' : ''}">Pagamento</span>
            <span class="status-step-pill ${currentStep >= 3 ? 'active' : ''}">Edição</span>
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

          <button type="button" class="status-btn-primary btn-advance-payment">
            Avançar para Pagamento (${pricing.formattedTotal})
          </button>
        </div>
      `;
    }

    if (currentStep === 2) {
      // Step 2: Payment Approval Simulation
      const transactionId = `STAT-${Date.now().toString().slice(-6)}`;
      return `
        <div class="status-step-payment">
          <div class="status-payment-success-icon">
            ${ICON_CHECK_CIRCLE}
          </div>
          <h2 class="status-payment-title">Pagamento Aprovado com Sucesso!</h2>
          <p class="status-payment-subtitle">Seu pedido foi confirmado instantaneamente. Agora configure os arquivos e redes sociais para publicar.</p>

          <div class="status-receipt-box">
            <div class="status-receipt-row">
              <span>Pedido:</span>
              <strong>#${transactionId}</strong>
            </div>
            <div class="status-receipt-row">
              <span>Plano Contratado:</span>
              <strong>${selectedPlan === 'status_impulsionado' ? 'Status Impulsionado' : 'Status Normal'} (${fileCount} arquivos)</strong>
            </div>
            <div class="status-receipt-row">
              <span>Valor Aprovado:</span>
              <strong>${pricing.formattedTotal}</strong>
            </div>
            <div class="status-receipt-row">
              <span>Status:</span>
              <span class="status-receipt-badge">Aprovado</span>
            </div>
          </div>

          <button type="button" class="status-btn-primary btn-proceed-publish">
            Prosseguir para Edição do Story &rarr;
          </button>
        </div>
      `;
    }

    if (currentStep === 3) {
      // Step 3: Media Upload and Social Profile Setup
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
                <label class="status-avatar-upload-label" title="Clique para enviar ou alterar foto de perfil">
                  <div class="status-avatar-preview">
                    ${profilePicData
                      ? `<img src="${profilePicData}" alt="Avatar" class="status-avatar-img" />`
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
                  <input type="text" class="input-profile-name" value="${escapeHtml(profileName)}" placeholder="Ex: Juliana Silva ou Daniel Vorcaro" required />
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
                <p>Recomendamos imagens verticais na proporção <strong>9:16 (1080 × 1920 px)</strong> para preencher toda a tela do status sem faixas. Vídeos não são aceitos no momento (máx. <strong>5 MB</strong> por anexo).</p>
              </div>

              <label class="status-field-label">
                <span>Anexos do Story (${uploadedFiles.length} de ${fileCount} contratados)</span>
              </label>

              ${uploadError ? `<div class="status-upload-error-msg" role="alert">${escapeHtml(uploadError)}</div>` : ''}

              <div class="status-files-dropzone">
                ${uploadedFiles.map((file, idx) => `
                  <div class="status-uploaded-tile ${idx === activeFileIndex ? 'selected' : ''}" data-id="${file.id}" role="button" tabindex="0" title="Clique para editar a legenda desta imagem">
                    <img src="${file.url}" alt="${escapeHtml(file.name)}" class="status-tile-img" />
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

              <div class="status-quick-samples">
                <button type="button" class="status-btn-samples">
                  + Preencher com fotos de exemplo
                </button>
              </div>
            </div>

            <label class="status-field-label">
              <span>Legenda do status (opcional)</span>
              <textarea class="input-caption" rows="2" placeholder="Digite uma legenda para este status...">${escapeHtml(currentCaption)}</textarea>
            </label>

            <div class="status-form-actions">
              <button type="button" class="status-btn-back-step" aria-label="Voltar" title="Voltar">
                ${ICON_BACK_ARROW}
              </button>
              <button type="submit" class="status-btn-primary btn-advance-preview">
                Ver Pré-visualização &rarr;
              </button>
            </div>
          </form>
        </div>
      `;
    }

    // Step 4: Preview Mode before approving publication
    const network = SOCIAL_NETWORKS[selectedNetwork] || SOCIAL_NETWORKS.instagram;
    const mediaList = uploadedFiles.length > 0
      ? uploadedFiles
      : [{ id: 'sample', name: 'Foto Exemplo', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', caption: '' }];

    const safeIdx = Math.min(previewActiveIdx, mediaList.length - 1);
    const activeMedia = mediaList[safeIdx];
    const activeCaption = activeMedia?.caption || caption || '';
    const generatedUrl = buildSocialLink(selectedNetwork, userHandle || 'usuario');

    return `
      <div class="status-step-preview">
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
                    ? `<img src="${profilePicData}" alt="Avatar" />`
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
              <img src="${activeMedia.url}" alt="${escapeHtml(activeMedia.name)}" class="status-preview-media-img" />

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

              <div class="story-social-btn" style="background: ${network.color};">
                ${network.icon}
                <span>Visitar perfil no ${network.name} (${escapeHtml(userHandle || 'user')}) ↗</span>
              </div>
            </footer>
          </div>
        </div>

        <div class="status-preview-actions-bar">
          <button type="button" class="status-btn-edit-preview">
            &larr; Voltar para editar
          </button>
          <button type="button" class="status-btn-primary btn-confirm-publish">
            Confirmar e Publicar Status
          </button>
        </div>
      </div>
    `;
  }

  function wireEvents(pricing) {
    modalEl.querySelector('.status-modal-close')?.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

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
          render();
        });
      });

      modalEl.querySelector('.btn-advance-payment')?.addEventListener('click', () => {
        currentStep = 2;
        render();
      });
    } else if (currentStep === 2) {
      modalEl.querySelector('.btn-proceed-publish')?.addEventListener('click', () => {
        currentStep = 3;
        render();
      });
    } else if (currentStep === 3) {
      // Step 3 events
      const nameInput = modalEl.querySelector('.input-profile-name');
      const handleInput = modalEl.querySelector('.input-user-handle');
      const linkPreview = modalEl.querySelector('.status-generated-link');
      const captionInput = modalEl.querySelector('.input-caption');
      const profilePicInput = modalEl.querySelector('.input-profile-pic');
      const mediaInput = modalEl.querySelector('.input-media-files');

      function updateLink() {
        const username = handleInput.value.trim() || 'usuario';
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

      // Click on uploaded tile to switch active attachment and show its caption
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

      // Social network switch (icon only)
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

      // Profile pic upload (single image, max 5MB)
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
            preview.innerHTML = `<img src="${profilePicData}" alt="Avatar" class="status-avatar-img" />`;
          }
        };
        reader.readAsDataURL(file);
      });

      // Media attachment upload: ONLY 1 ATTACHMENT PER SELECTION, MAX 5MB, NO VIDEOS
      mediaInput?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // Reject video
        if (file.type && !file.type.startsWith('image/')) {
          uploadError = 'Vídeos não são permitidos. Envie uma imagem vertical (9:16) em JPG, PNG ou WEBP.';
          render();
          return;
        }

        // Check size limit (max 5 MB)
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
              caption: '', // Clean for new attachment!
            };
            uploadedFiles.push(newFile);
            activeFileIndex = uploadedFiles.length - 1; // Newly added is selected
            caption = ''; // Clear caption awaiting new text!
            profileName = nameInput.value;
            userHandle = handleInput.value.trim();
            render();
            setTimeout(() => {
              modalEl.querySelector('.input-caption')?.focus();
            }, 50);
          };
          reader.readAsDataURL(file);
        }
      });

      // Quick sample button
      modalEl.querySelector('.status-btn-samples')?.addEventListener('click', () => {
        const sampleImages = [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
        ];

        while (uploadedFiles.length < fileCount) {
          const idx = uploadedFiles.length;
          uploadedFiles.push({
            id: `sample-${Date.now()}-${idx}`,
            name: `Foto 9:16 #${idx + 1}.jpg`,
            url: sampleImages[idx % sampleImages.length],
            type: 'image/jpeg',
            caption: '',
          });
        }
        activeFileIndex = uploadedFiles.length - 1;
        caption = '';
        profileName = nameInput.value;
        userHandle = handleInput.value.trim();
        uploadError = '';
        render();
        setTimeout(() => {
          modalEl.querySelector('.input-caption')?.focus();
        }, 50);
      });

      // Remove uploaded file
      modalEl.querySelectorAll('.status-tile-delete-btn, .status-remove-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const delId = btn.dataset.id;
          uploadedFiles = uploadedFiles.filter(f => f.id !== delId);
          if (activeFileIndex >= uploadedFiles.length) {
            activeFileIndex = uploadedFiles.length - 1;
          }
          caption = activeFileIndex >= 0 ? (uploadedFiles[activeFileIndex].caption || '') : '';
          profileName = nameInput.value;
          userHandle = handleInput.value.trim();
          render();
        });
      });

      // Back button (icon only) to Step 1
      modalEl.querySelector('.status-btn-back-step')?.addEventListener('click', () => {
        currentStep = 1;
        render();
      });

      // Advance to Preview Step
      const form = modalEl.querySelector('.status-publish-form');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        profileName = nameInput.value.trim() || 'Anunciante';
        userHandle = handleInput.value.trim() || 'usuario';

        if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length && captionInput) {
          uploadedFiles[activeFileIndex].caption = captionInput.value.trim();
        }
        caption = captionInput ? captionInput.value.trim() : '';

        if (uploadedFiles.length === 0) {
          uploadedFiles.push({
            id: `media-sample-${Date.now()}`,
            name: 'Story Vertical 9:16.jpg',
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
            type: 'image/jpeg',
            caption: caption || '',
          });
          activeFileIndex = 0;
        }

        previewActiveIdx = 0;
        currentStep = 4; // Advance to Preview Step!
        render();
      });
    } else if (currentStep === 4) {
      // Step 4: Preview Mode Events
      const mediaList = uploadedFiles.length > 0
        ? uploadedFiles
        : [{ id: 'sample', name: 'Foto', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' }];

      // Cycle media in preview
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

      // Voltar para editar (Step 3)
      modalEl.querySelector('.status-btn-edit-preview')?.addEventListener('click', () => {
        currentStep = 3;
        render();
      });

      // Confirm and Publish to PostgreSQL & Platform
      modalEl.querySelector('.btn-confirm-publish')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Gravando no banco e publicando...';

        const finalHandle = userHandle.startsWith('@') ? userHandle : `@${userHandle}`;
        const finalLink = buildSocialLink(selectedNetwork, userHandle);

        try {
          const published = await createStatusPurchase({
            plan_type: selectedPlan,
            file_count: uploadedFiles.length,
            unit_price: pricing.unitPrice,
            discount_amount: pricing.discountAmount,
            total_price: pricing.finalTotal,
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
