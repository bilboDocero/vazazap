/** Navigation rail, following the supplied WhatsApp Web reference. */
const ICON_CHAT = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 4h18a1 1 0 0 1 1 1v2H2V5a1 1 0 0 1 1-1Zm0 5h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm6 3v2h6v-2H9Z"/></svg>`;
const ICON_CALLS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 3-5 3-9 1S4 14 3 9s0-6 2-6Z"/><path d="M14 4h5v5m0-5-5 5"/></svg>`;
const ICON_STATUS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8.5 3.6A9 9 0 0 0 3 12m.8 3.7a9 9 0 0 0 13.6 3.7M20.2 16a9 9 0 0 0-7-12.9"/><circle cx="12" cy="12" r="5.2"/></svg>`;
const ICON_CHANNELS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a9 9 0 0 1-13.3 7.9L3 21l1.4-5.1A9 9 0 1 1 21 11.5Z"/><path d="M8.1 8a5 5 0 0 0 0 7m7.8-7a5 5 0 0 1 0 7"/><circle cx="12" cy="11.5" r="1.5" fill="currentColor" stroke="none"/></svg>`;
const ICON_COMMUNITIES = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="7" r="2.8"/><circle cx="4.5" cy="9" r="2.2"/><circle cx="19.5" cy="9" r="2.2"/><path d="M6.5 19v-2.2c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3V19h-11ZM1 18v-2c0-2 1.6-3.4 3.8-3.4.8 0 1.5.2 2.1.5A6 6 0 0 0 4.5 18H1Zm18.5 0a6 6 0 0 0-2.4-4.9c.6-.3 1.3-.5 2.1-.5 2.2 0 3.8 1.4 3.8 3.4v2h-3.5Z"/></svg>`;
const ICON_AI = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"><g fill="#A34DFF"><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2"/><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2" transform="rotate(120 12 12)"/><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2" transform="rotate(180 12 12)"/><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2" transform="rotate(240 12 12)"/></g><ellipse cx="12" cy="5.2" rx="2.3" ry="3.2" transform="rotate(300 12 12)" fill="#6978FF"/><circle cx="12" cy="12" r="2" fill="#CF9AFF"/></svg>`;
const ICON_ADD = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="#2DD45B"/><path d="M12 6v12M6 12h12" stroke="#FFF" stroke-width="2.2"/></svg>`;
const ICON_LIBRARY = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="15" height="15" rx="1.5"/><path d="M3 7v14h14M9 14l3-4 2 2 2-3 3 5H9Z"/><circle cx="10" cy="7" r="1" fill="currentColor" stroke="none"/></svg>`;

export function renderNavRail(container, { avatarSrc, onSettings, onChat, onCalls, onStatus, onChannels, onCommunities, onFind, onProfile, unreadCount = 0 } = {}) {
  const rail = document.createElement('nav');
  rail.className = 'nav-rail';
  rail.setAttribute('aria-label', 'Navegação');

  function button(icon, label, action, unavailable = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-rail-btn';
    btn.setAttribute('aria-label', label);
    btn.title = unavailable ? `${label} · indisponível neste acervo` : label;
    btn.innerHTML = icon; // Static SVG literals only.
    btn.querySelector('svg').setAttribute('aria-hidden', 'true');
    if (unavailable) {
      btn.classList.add('disabled');
      btn.disabled = true;
    }
    if (action) btn.addEventListener('click', action);
    return btn;
  }

  const top = document.createElement('div');
  top.className = 'nav-rail-top';
  const main = document.createElement('div');
  main.className = 'nav-rail-main';
  const chats = button(ICON_CHAT, 'Conversas', onChat);
  const calls = button(ICON_CALLS, 'Chamadas', onCalls);
  const status = button(ICON_STATUS, 'Status', onStatus);
  const channels = button(ICON_CHANNELS, 'Canais', onChannels);
  const communities = button(ICON_COMMUNITIES, 'Comunidades', onCommunities);
  const badge = document.createElement('span');
  badge.className = 'nav-rail-badge';
  badge.setAttribute('aria-hidden', 'true');
  chats.appendChild(badge);
  main.append(chats, calls,
    status,
    channels,
    communities);
  top.appendChild(main);

  function separator() {
    const line = document.createElement('div');
    line.className = 'nav-rail-separator';
    line.setAttribute('role', 'separator');
    return line;
  }
  top.append(separator(), button(ICON_AI, 'IA', null, true), separator(),
    button(ICON_ADD, 'Encontrar conversa', onFind));

  const bottom = document.createElement('div');
  bottom.className = 'nav-rail-bottom';
  bottom.appendChild(button(ICON_LIBRARY, 'Sobre', onSettings));
  const avatar = document.createElement('button');
  avatar.type = 'button';
  avatar.className = 'nav-rail-avatar';
  avatar.setAttribute('aria-label', 'Perfil de Daniel Vorcaro');
  avatar.title = 'Perfil de Daniel Vorcaro';
  if (avatarSrc) {
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.alt = '';
    img.className = 'nav-rail-avatar-img';
    avatar.appendChild(img);
  }
  if (onProfile) avatar.addEventListener('click', onProfile);
  bottom.appendChild(avatar);
  rail.append(top, bottom);

  rail.setUnreadCount = (count) => {
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    chats.title = count ? `Conversas · ${count} não abertas` : 'Conversas';
    if (count) chats.setAttribute('aria-description', `${count} conversas ainda não abertas`);
    else chats.removeAttribute('aria-description');
  };
  rail.setActive = (which) => {
    for (const [btn, key] of [[chats, 'chats'], [calls, 'calls'], [status, 'status'], [channels, 'channels'], [communities, 'communities']]) {
      btn.classList.toggle('active', which === key);
      if (which === key) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
  };
  rail.setUnreadCount(unreadCount);
  rail.setActive('chats');
  container.insertBefore(rail, container.firstChild);
  return rail;
}

export { ICON_CHAT, ICON_CALLS, ICON_STATUS, ICON_CHANNELS, ICON_COMMUNITIES };
