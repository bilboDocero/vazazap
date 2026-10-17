/** Navigation rail, following the supplied WhatsApp Web reference. */
const ICON_CHAT = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" fill-rule="evenodd" d="M22 6.67C22 5.19 20.8 4 19.33 4H1.8a1 1 0 0 0-.85 1.53L3 9v8.33C3 18.81 4.2 20 5.67 20h13.66c1.48 0 2.67-1.2 2.67-2.67V6.67ZM7 10a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H8Z" clip-rule="evenodd"></path></svg>`;
const ICON_CALLS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 3-5 3-9 1S4 14 3 9s0-6 2-6Z"/><path d="M14 4h5v5m0-5-5 5"/></svg>`;
const ICON_STATUS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8.5 3.6A9 9 0 0 0 3 12m.8 3.7a9 9 0 0 0 13.6 3.7M20.2 16a9 9 0 0 0-7-12.9"/><circle cx="12" cy="12" r="5.2"/></svg>`;
const ICON_CHANNELS = `<svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" fill="currentColor"><title>wds-ic-channels</title><path fill="currentColor" fill-rule="evenodd" d="M15.83 8.63A1 1 0 0 1 17.2 9a5.98 5.98 0 0 1 0 6 1 1 0 0 1-1.73-1 3.98 3.98 0 0 0 0-4 1 1 0 0 1 .36-1.37Zm-7.66 0A1 1 0 0 1 8.53 10a3.98 3.98 0 0 0 0 4 1 1 0 0 1-1.73 1 5.98 5.98 0 0 1 0-6 1 1 0 0 1 1.37-.37Z" clip-rule="evenodd"></path><path fill="currentColor" d="M13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"></path><path fill="currentColor" fill-rule="evenodd" d="m5.33 16.48-.23.8c-.24.77-.48 1.6-.68 2.3.7-.2 1.53-.44 2.3-.68l.8-.23.72.39a8 8 0 1 0-3.3-3.3l.4.72Zm-2.15.22A48.91 48.91 0 0 0 2 21a1 1 0 0 0 1 1c.31 0 2.46-.63 4.3-1.18a10 10 0 1 0-4.12-4.12Z" clip-rule="evenodd"></path></svg>`;
const ICON_COMMUNITIES = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" fill-rule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clip-rule="evenodd"></path></svg>`;
const ICON_ADD = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="#2DD45B"/><path d="M12 6v12M6 12h12" stroke="#FFF" stroke-width="2.2"/></svg>`;
const ICON_LIBRARY = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="15" height="15" rx="1.5"/><path d="M3 7v14h14M9 14l3-4 2 2 2-3 3 5H9Z"/><circle cx="10" cy="7" r="1" fill="currentColor" stroke="none"/></svg>`;

import { ICON_STORE, ICON_ADVERTISE } from '../lib/commercial-content.js';

export function renderNavRail(container, { avatarSrc, onSettings, onChat, onCalls, onStatus, onChannels, onCommunities, onVitrine, onAnunciar, onFind, onProfile, unreadCount = 0 } = {}) {
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
  const vitrine = button(ICON_STORE, 'Vitrine', onVitrine);
  const vitrineDot = document.createElement('span');
  vitrineDot.className = 'nav-rail-dot';
  vitrineDot.setAttribute('aria-hidden', 'true');
  vitrine.appendChild(vitrineDot);

  const anunciar = button(ICON_ADVERTISE, 'Anunciar', onAnunciar);

  const badge = document.createElement('span');
  badge.className = 'nav-rail-badge';
  badge.setAttribute('aria-hidden', 'true');
  chats.appendChild(badge);
  function separator() {
    const line = document.createElement('div');
    line.className = 'nav-rail-separator';
    line.setAttribute('role', 'separator');
    return line;
  }

  main.append(chats, calls,
    status,
    channels,
    communities,
    separator(),
    vitrine,
    anunciar);
  top.appendChild(main);

  top.append(separator(),
    button(ICON_ADD, 'Novo anunciar', onAnunciar || onFind));

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
    for (const [btn, key] of [
      [chats, 'chats'],
      [calls, 'calls'],
      [status, 'status'],
      [channels, 'channels'],
      [communities, 'communities'],
      [vitrine, 'vitrine'],
      [anunciar, 'anunciar'],
    ]) {
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

export { ICON_CHAT, ICON_CALLS, ICON_STATUS, ICON_CHANNELS, ICON_COMMUNITIES, ICON_STORE, ICON_ADVERTISE };
