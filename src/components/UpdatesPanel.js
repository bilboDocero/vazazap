import { ICON_SEARCH } from '../lib/icons.js';
import { ICON_STATUS, ICON_CHANNELS } from './NavRail.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { loadFollowedChannels, saveFollowedChannels } from '../lib/updates-content.js';

const ICON_PLUS = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function avatar(entry, status = false) {
  const el = document.createElement('span');
  el.className = `updates-avatar${status ? ' updates-avatar--status' : ''}`;
  if (entry.avatar) {
    const img = document.createElement('img');
    img.src = entry.avatar;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.innerHTML = defaultAvatarSvg(entry.id); // Generated SVG, no user markup.
  }
  return el;
}

export function renderUpdatesPanel({ kind, entries, onSelect }) {
  const channels = kind === 'channels';
  const panel = document.createElement('section');
  panel.className = `updates-panel updates-panel--${kind}`;
  panel.setAttribute('aria-label', channels ? 'Canais do Vorcaro' : 'Status do Vorcaro');
  panel.innerHTML = `
    <header class="updates-header">
      <h1>${channels ? 'Canais' : 'Status'}</h1>
      <button class="updates-add" disabled aria-label="${channels ? 'Criar canal' : 'Adicionar status'}" title="Publicação disponível futuramente">${ICON_PLUS}</button>
    </header>
    ${channels ? `<label class="updates-search">${ICON_SEARCH}<input type="search" placeholder="Pesquisar" aria-label="Pesquisar canais" autocomplete="off"/></label>` : ''}
    <div class="updates-list"></div>
    <p class="updates-note">Simulação visual · imagens em breve</p>
  `;
  const list = panel.querySelector('.updates-list');
  const followed = loadFollowedChannels();
  let expanded = false;
  let selected = null;

  function heading(text) {
    const el = document.createElement('h2');
    el.className = 'updates-section-title';
    el.textContent = text;
    list.appendChild(el);
  }

  function row(entry, self = false) {
    const wrap = document.createElement('div');
    wrap.className = 'updates-row';
    wrap.dataset.id = entry.id;
    wrap.classList.toggle('active', entry.id === selected);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'updates-open';
    open.setAttribute('aria-label', `${channels ? 'Abrir canal' : 'Ver status'} de ${entry.name}`);
    const photo = avatar(entry, !channels && !self);
    if (!channels && self) {
      const plus = document.createElement('span');
      plus.className = 'updates-avatar-plus';
      plus.textContent = '+';
      photo.appendChild(plus);
    }
    open.appendChild(photo);
    const text = document.createElement('span');
    text.className = 'updates-row-text';
    const name = document.createElement('span');
    name.className = 'updates-row-name';
    name.textContent = !channels && self ? 'Meu status' : entry.name;
    const subtitle = document.createElement('span');
    subtitle.className = 'updates-row-subtitle';
    subtitle.textContent = channels ? 'Nenhuma publicação ainda' : self ? 'Daniel Vorcaro · sem atualizações' : 'Nenhum status publicado';
    text.append(name, subtitle);
    open.appendChild(text);
    open.addEventListener('click', () => onSelect(entry.id));
    wrap.appendChild(open);
    if (channels && !self) {
      const follow = document.createElement('button');
      follow.className = 'updates-follow';
      const isFollowing = followed.has(entry.id);
      follow.textContent = isFollowing ? 'Seguindo' : 'Seguir';
      follow.setAttribute('aria-label', `${isFollowing ? 'Deixar de seguir' : 'Seguir'} ${entry.name}`);
      follow.setAttribute('aria-pressed', String(isFollowing));
      follow.addEventListener('click', () => {
        if (followed.has(entry.id)) followed.delete(entry.id);
        else followed.add(entry.id);
        saveFollowedChannels(followed);
        draw();
        list.querySelector(`[data-id="${entry.id}"] .updates-follow`)?.focus();
      });
      wrap.appendChild(follow);
    }
    list.appendChild(wrap);
  }

  function draw() {
    list.replaceChildren();
    const term = normalize(panel.querySelector('input')?.value.trim() || '');
    const matching = entries.filter(entry => normalize(entry.name).includes(term));
    const own = matching.find(entry => entry.id === 'vorcaro');
    if (own) row(own, true);
    if (channels) {
      const following = matching.filter(entry => entry.id !== 'vorcaro' && followed.has(entry.id));
      if (following.length) {
        heading('Canais que você segue');
        following.forEach(entry => row(entry));
      }
      const suggestions = matching.filter(entry => entry.id !== 'vorcaro' && !followed.has(entry.id));
      if (suggestions.length) {
        heading('Encontrar canais para seguir');
        (expanded || term ? suggestions : suggestions.slice(0, 5)).forEach(entry => row(entry));
        if (!term && suggestions.length > 5) {
          const more = document.createElement('button');
          more.className = 'updates-discover';
          more.textContent = expanded ? 'Mostrar menos' : 'Descobrir mais';
          more.setAttribute('aria-expanded', String(expanded));
          more.addEventListener('click', () => { expanded = !expanded; draw(); list.querySelector('.updates-discover')?.focus(); });
          list.appendChild(more);
        }
      }
    } else {
      heading('Contatos · aguardando atualizações');
      matching.filter(entry => entry.id !== 'vorcaro').forEach(entry => row(entry));
    }
    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'updates-no-results';
      empty.setAttribute('role', 'status');
      empty.textContent = 'Nenhum canal encontrado.';
      list.appendChild(empty);
    }
  }
  panel.querySelector('input')?.addEventListener('input', draw);
  panel.setActive = id => {
    selected = id;
    panel.querySelectorAll('.updates-row').forEach(row => row.classList.toggle('active', row.dataset.id === id));
  };
  draw();
  return panel;
}

export function renderUpdatesDetail(container, { kind, entry, onBack, onConversation }) {
  const channels = kind === 'channels';
  const el = document.createElement('section');
  el.className = `updates-detail updates-detail--${kind}${entry ? ' has-selection' : ''}`;
  const header = document.createElement('header');
  header.className = 'updates-detail-header';
  const back = document.createElement('button');
  back.className = 'updates-back';
  back.setAttribute('aria-label', channels ? 'Voltar aos canais' : 'Voltar aos status');
  back.innerHTML = ICON_BACK;
  back.addEventListener('click', onBack);
  header.appendChild(back);
  if (entry) header.appendChild(avatar(entry));
  const title = document.createElement('span');
  title.textContent = entry?.name || (channels ? 'Canais do Vorcaro' : 'Status do Vorcaro');
  header.appendChild(title);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'updates-detail-body';
  const icon = document.createElement('div');
  icon.className = 'updates-detail-icon';
  icon.innerHTML = channels ? ICON_CHANNELS : ICON_STATUS;
  body.appendChild(icon);
  const badge = document.createElement('span');
  badge.className = 'updates-preview-label';
  badge.textContent = 'Simulação · em preparação';
  const heading = document.createElement('h2');
  heading.textContent = entry
    ? (channels ? 'Este canal ainda não tem publicações' : 'Nenhum status por enquanto')
    : (channels ? 'Um novo jeito de explorar o acervo' : 'Os momentos, em formato de status');
  const text = document.createElement('p');
  text.textContent = channels
    ? 'Aqui entrarão simulações com imagens públicas de Daniel Vorcaro e seus contatos. Siga os canais que deseja acompanhar.'
    : 'Aqui entrarão simulações de status com imagens públicas de Daniel Vorcaro e seus contatos.';
  body.append(badge, heading, text);
  if (entry?.conversationId) {
    const chat = document.createElement('button');
    chat.className = 'updates-open-conversation';
    chat.textContent = 'Ver histórico da conversa';
    chat.addEventListener('click', () => onConversation(entry.conversationId));
    body.appendChild(chat);
  }
  el.appendChild(body);
  container.replaceChildren(el);
}
