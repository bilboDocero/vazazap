/**
 * AgendaDetail component — renders the main-area view for the Agenda tab,
 * displaying detailed journalistic dossiers on the contacts disclosed by Folha de S.Paulo.
 */

import { AGENDA_SOURCE, AGENDA_CONTACTS } from '../lib/agenda-content.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { escapeHtml } from '../lib/utils.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const ICON_PHONE_BOOK = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg>`;
const ICON_EXTERNAL = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

export function renderAgendaDetail(container, { contactId = null, onBack, onOpenConversation }) {
  const contact = AGENDA_CONTACTS.find(c => c.id === contactId) || null;
  const el = document.createElement('section');
  el.className = `agenda-detail${contact ? ' has-selection' : ''}`;

  if (!contact) {
    // Welcome / Overview screen
    el.innerHTML = `
      <header class="agenda-detail-header">
        <button class="agenda-detail-back-btn" aria-label="Voltar à lista">
          ${ICON_BACK}
        </button>
        <div class="agenda-detail-header-info">
          <span class="agenda-detail-title">Agenda Telefônica de Daniel Vorcaro</span>
        </div>
      </header>

      <div class="agenda-detail-body">
        <div class="agenda-welcome-hero">
          <div class="agenda-welcome-icon">
            ${ICON_PHONE_BOOK}
          </div>
          <span class="agenda-welcome-badge">Operação Compliance Zero · Folha de S.Paulo</span>
          <h2 class="agenda-welcome-title">Agenda Telefônica de Daniel Vorcaro</h2>
          <p class="agenda-welcome-text">
            Em 5 de março de 2026, a <strong>Folha de S.Paulo</strong> revelou a relação de autoridades dos Três Poderes, governadores, banqueiros e empresários cujos números estavam salvos na memória do iPhone 17 Pro apreendido pela Polícia Federal.
          </p>
        </div>

        <div class="agenda-stats-grid">
          <div class="agenda-stat-card">
            <span class="agenda-stat-num">6</span>
            <span class="agenda-stat-label">STF & Tribunais</span>
            <small>Ministros e ex-ministros de cortes superiores</small>
          </div>
          <div class="agenda-stat-card">
            <span class="agenda-stat-num">10</span>
            <span class="agenda-stat-label">Congresso Nacional</span>
            <small>Senadores e deputados federais</small>
          </div>
          <div class="agenda-stat-card">
            <span class="agenda-stat-num">10</span>
            <span class="agenda-stat-label">Governo & Executivo</span>
            <small>Governadores, ministros de Estado e ex-ministros</small>
          </div>
          <div class="agenda-stat-card">
            <span class="agenda-stat-num">10</span>
            <span class="agenda-stat-label">Mercado & Jurídico</span>
            <small>Grandes empresários e advogados de destaque</small>
          </div>
        </div>

        <div class="agenda-legal-box">
          <h3>Ressalva Institucional e Jurídica</h3>
          <p>${escapeHtml(AGENDA_SOURCE.legalNote)}</p>
        </div>

        <div class="agenda-source-footer">
          <span>Fonte da apuração jornalística:</span>
          <a href="${AGENDA_SOURCE.url}" target="_blank" rel="noopener noreferrer" class="agenda-source-link">
            ${escapeHtml(AGENDA_SOURCE.title)} (${AGENDA_SOURCE.publisher}, 05/03/2026) ${ICON_EXTERNAL}
          </a>
        </div>
      </div>
    `;

    el.querySelector('.agenda-detail-back-btn')?.addEventListener('click', onBack);
    container.replaceChildren(el);
    return el;
  }

  // Selected contact dossier
  el.innerHTML = `
    <header class="agenda-detail-header">
      <button class="agenda-detail-back-btn" aria-label="Voltar à agenda">
        ${ICON_BACK}
      </button>
      <div class="agenda-detail-header-info">
        <span class="agenda-detail-title">${escapeHtml(contact.name)}</span>
        <span class="agenda-detail-subtitle">${escapeHtml(contact.category)}</span>
      </div>
    </header>

    <div class="agenda-detail-body">
      <div class="agenda-contact-hero">
        <div class="agenda-contact-avatar-large">
          ${contact.avatar
            ? `<img src="${contact.avatar}" alt="${escapeHtml(contact.name)}" />`
            : defaultAvatarSvg(contact.name, 72)
          }
        </div>
        <h2 class="agenda-contact-title">${escapeHtml(contact.name)}</h2>
        <span class="agenda-contact-role-badge">${escapeHtml(contact.role)}</span>
      </div>

      <div class="agenda-dossier-card">
        <h3>Registro no Aparelho Apreendido</h3>
        <div class="agenda-dossier-rows">
          <div class="agenda-dossier-row">
            <span>Salvo no aparelho como:</span>
            <strong>${escapeHtml(contact.savedAs || contact.name)}</strong>
          </div>
          <div class="agenda-dossier-row">
            <span>Número registrado:</span>
            <strong>${escapeHtml(contact.phone || 'Número confidencial na perícia')}</strong>
          </div>
          <div class="agenda-dossier-row">
            <span>Categoria institucional:</span>
            <strong>${escapeHtml(contact.category)}</strong>
          </div>
          <div class="agenda-dossier-row">
            <span>Fonte da comprovação:</span>
            <strong>${escapeHtml(contact.source)}</strong>
          </div>
        </div>
      </div>

      <div class="agenda-dossier-card">
        <h3>Contexto e Apurações da Imprensa</h3>
        <p class="agenda-dossier-desc">${escapeHtml(contact.description)}</p>
      </div>

      <div class="agenda-actions-section">
        ${contact.hasConversation && contact.conversationId ? `
          <button type="button" class="agenda-btn-chat">
            Abrir conversa completa no acervo (WhatsApp) &rarr;
          </button>
        ` : `
          <div class="agenda-notice-box">
            <p>Nenhuma mensagem vazada transcrita no relatório público para este contato. A evidência disponível limita-se ao registro telefônico na memória do aparelho.</p>
          </div>
          <a href="${AGENDA_SOURCE.url}" target="_blank" rel="noopener noreferrer" class="agenda-btn-source">
            Ler reportagem da Folha de S.Paulo ${ICON_EXTERNAL}
          </a>
        `}
      </div>
    </div>
  `;

  el.querySelector('.agenda-detail-back-btn')?.addEventListener('click', onBack);

  el.querySelector('.agenda-btn-chat')?.addEventListener('click', () => {
    if (onOpenConversation) onOpenConversation(contact.conversationId);
  });

  container.replaceChildren(el);
  return el;
}
