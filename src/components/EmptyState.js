/**
 * EmptyState component — shown in the main area when no conversation is selected.
 * Matches WhatsApp Web's centered intro screen.
 *
 * Security note: innerHTML contains only static markup (no dynamic data).
 */

const LOCK_ICON = `<svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>`;

/**
 * @param {HTMLElement} container
 * @returns {HTMLElement}
 */
export function renderEmptyState(container) {
  const el = document.createElement('div');
  el.className = 'empty-state';

  // Entirely static content — safe innerHTML
  el.innerHTML = `
    <div class="empty-state-illustration" aria-hidden="true">
      <svg viewBox="0 0 360 210" width="360" height="210" fill="none">
        <ellipse cx="180" cy="182" rx="156" ry="13" fill="#E7ECE9"/>
        <circle cx="180" cy="98" r="88" fill="#E9F2EC"/>
        <rect x="60" y="32" width="241" height="145" rx="9" fill="#FFF" stroke="#B6C6BE" stroke-width="2"/>
        <path d="M61 54h239" stroke="#DCE5DF" stroke-width="2"/>
        <circle cx="73" cy="43" r="2" fill="#A6B9AD"/><circle cx="82" cy="43" r="2" fill="#A6B9AD"/><circle cx="91" cy="43" r="2" fill="#A6B9AD"/>
        <path d="M46 177h269l10 7a3 3 0 0 1-2 5H38a3 3 0 0 1-2-5l10-7Z" fill="#D6E1DB" stroke="#B6C6BE" stroke-width="2"/>
        <rect x="72" y="66" width="66" height="98" rx="3" fill="#F0F4F1"/>
        <g fill="#CCDCD1"><circle cx="85" cy="81" r="6"/><circle cx="85" cy="105" r="6"/><circle cx="85" cy="129" r="6"/></g>
        <path d="M99 79h27m-27 6h19m-19 18h27m-27 6h19m-19 18h27m-27 6h19" stroke="#B8CBBE" stroke-width="3" stroke-linecap="round"/>
        <path d="M152 73h74a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5h-67l-7 5V73Z" fill="#E9EEEB"/>
        <path d="M201 115h75v34l-8-5h-67a5 5 0 0 1-5-5v-19a5 5 0 0 1 5-5Z" fill="#D9FDD3"/>
        <path d="M164 84h53m-53 9h35m44 33h48m-48 9h32" stroke="#A2B7A8" stroke-width="3" stroke-linecap="round"/>
        <rect x="28" y="101" width="49" height="85" rx="8" fill="#FFF" stroke="#9FB6A7" stroke-width="2"/>
        <rect x="34" y="112" width="37" height="59" rx="3" fill="#E7F7EB"/>
        <path d="M47 107h11m-8 72h5" stroke="#9FB6A7" stroke-width="2" stroke-linecap="round"/>
        <circle cx="285" cy="49" r="25" fill="#25D366"/>
        <path d="m274 49 7 7 15-15" stroke="#FFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1 class="empty-state-title">MasterWhats</h1>
    <span class="empty-state-subtitle">O histórico, conversa por conversa.</span>
    <p class="empty-state-text">
      Explore as mensagens de Daniel Vorcaro em uma interface familiar.<br>
      Escolha uma conversa ao lado ou comece por uma das favoritas.
    </p>
    <div class="empty-state-actions">
      <a href="#/chat/alexandre-de-moraes" class="empty-state-chat"><img src="/assets/avatar-alexandre-de-moraes.jpg" alt=""/>Alexandre de Moraes<span aria-hidden="true">›</span></a>
      <a href="#/chat/martha-graeff" class="empty-state-chat"><img src="/assets/avatar-martha-graeff.jpeg" alt=""/>Martha Graeff<span aria-hidden="true">›</span></a>
    </div>
    <div class="empty-state-footer">
      ${LOCK_ICON}
      <span>Acervo público · Somente leitura · Projeto independente</span>
    </div>
  `;

  container.appendChild(el);
  return el;
}
