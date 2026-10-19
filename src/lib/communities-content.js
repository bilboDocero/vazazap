import { getJournalisticGroups, NEWS_REVIEWED_AT } from './community-news.js';
import { getResenhaGroups } from './community-resenha.js';

/**
 * Data and models for Communities (Comunidades).
 * Inspired by WhatsApp Web communities layout and mechanisms.
 */

export const ICON_COMMUNITY_PEOPLE = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" fill-rule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clip-rule="evenodd"></path></svg>`;

export const ICON_MEGAPHONE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.5 4.5a1.2 1.2 0 0 0-1.7-.3L8.2 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2.2l1.6 4.7a1.5 1.5 0 0 0 1.9.9l1.4-.5a1.5 1.5 0 0 0 .9-1.9L12 16.5l5.8 3.4a1.2 1.2 0 0 0 1.7-.3c.4-.6.4-1.4.4-1.9V6.4c0-.5 0-1.3-.4-1.9z"/></svg>`;

export const ICON_MUTE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27l4.66 4.66L7 9.5v5h4l5 5v-6.73l4.25 4.25 1.27-1.27L4.27 3zM14 15.17l-2.45-2.45L14 10.27v4.9z"/></svg>`;

export const ICON_PLUS_CIRCLE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`;

export const ICON_LOCK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`;

export function renderJournalismAvatar() {
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="var(--WDS-accent-deemphasized, #D9FDD3)"/>
      <g stroke="var(--WDS-accent, #008069)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="10" y="11" width="28" height="26" rx="3"/>
        <rect x="14" y="16" width="8" height="8" rx="1"/>
        <path d="M27 17h7m-7 6h7M14 29h20m-20 4h13"/>
      </g>
    </svg>
  `;
}

export function renderDiscussionAvatar() {
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="var(--WDS-emerald-75, #E1FEF2)"/>
      <g stroke="var(--WDS-accent, #008069)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 11h19a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H19l-7 5v-5a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3Z"/>
        <path d="M19 33h10l7 5v-5a3 3 0 0 0 3-3V19m-24-1h13m-13 5h8"/>
      </g>
    </svg>
  `;
}

export function renderGenericCommunityAvatar(name) {
  const char = (name || 'C').charAt(0).toUpperCase();
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="#E8F5E9"/>
      <text x="24" y="30" font-size="18" font-family="system-ui, -apple-system, sans-serif" font-weight="600" fill="#008069" text-anchor="middle">${char}</text>
    </svg>
  `;
}

export function renderSubgroupAvatar(type) {
  if (type === 'pink') {
    return `
      <svg viewBox="0 0 44 44" width="44" height="44" fill="none" class="subgroup-avatar-svg">
        <rect width="44" height="44" rx="10" fill="#FEE8E8"/>
        <g transform="translate(10, 10)" fill="#E53935">
          <path d="M19.5 4.5a1.2 1.2 0 0 0-1.7-.3L8.2 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2.2l1.6 4.7a1.5 1.5 0 0 0 1.9.9l1.4-.5a1.5 1.5 0 0 0 .9-1.9L12 16.5l5.8 3.4a1.2 1.2 0 0 0 1.7-.3c.4-.6.4-1.4.4-1.9V6.4c0-.5 0-1.3-.4-1.9z"/>
        </g>
      </svg>
    `;
  }
  if (type === 'teal') {
    return `
      <svg viewBox="0 0 44 44" width="44" height="44" fill="none" class="subgroup-avatar-svg">
        <rect width="44" height="44" rx="10" fill="#E0F7F6"/>
        <g transform="translate(10, 10)" fill="#00897B">
          <path d="M19.5 4.5a1.2 1.2 0 0 0-1.7-.3L8.2 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2.2l1.6 4.7a1.5 1.5 0 0 0 1.9.9l1.4-.5a1.5 1.5 0 0 0 .9-1.9L12 16.5l5.8 3.4a1.2 1.2 0 0 0 1.7-.3c.4-.6.4-1.4.4-1.9V6.4c0-.5 0-1.3-.4-1.9z"/>
        </g>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 44 44" width="44" height="44" fill="none" class="subgroup-avatar-svg">
      <rect width="44" height="44" rx="10" fill="#EDF2F7"/>
      <g transform="translate(10, 10)" fill="#4A5568">
        <circle cx="12" cy="7" r="2.8"/>
        <circle cx="4.5" cy="9" r="2.2"/>
        <circle cx="19.5" cy="9" r="2.2"/>
        <path d="M6.5 19v-2.2c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3V19h-11ZM1 18v-2c0-2 1.6-3.4 3.8-3.4.8 0 1.5.2 2.1.5A6 6 0 0 0 4.5 18H1Zm18.5 0a6 6 0 0 0-2.4-4.9c.6-.3 1.3-.5 2.1-.5 2.2 0 3.8 1.4 3.8 3.4v2h-3.5Z"/>
      </g>
    </svg>
  `;
}

export function getBuiltinCommunities() {
  return [
    {
      id: 'plantao-caso-vorcaro',
      name: 'Caso Vorcaro · Notícias e Documentos',
      description: 'Entenda o caso Banco Master com notícias, documentos públicos e uma cronologia dos acontecimentos. Informações com fontes, datas e respostas dos envolvidos.',
      tagline: 'Notícias e fontes públicas',
      avatarSvg: renderJournalismAvatar(),
      editorial: true,
      reviewedAt: NEWS_REVIEWED_AT,
      groups: getJournalisticGroups(),
    },
    {
      id: 'fofocas-caso-vorcaro',
      name: 'Caso Vorcaro · Memes e Resenha',
      description: 'Memes originais e reações fictícias sobre o caso. Uma resenha com personagens inventados, humor do cotidiano e referências reais no grupo de VIPs.',
      tagline: 'Humor e comentários',
      avatarSvg: renderDiscussionAvatar(),
      simulated: true,
      groups: getResenhaGroups(),
    },
  ];
}

const STORAGE_KEY = 'vorcarozap:custom-communities';

export function loadCustomCommunities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveCustomCommunity(community) {
  try {
    const current = loadCustomCommunities();
    current.unshift(community);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage issues
  }
}

export function getCommunitiesData() {
  const custom = loadCustomCommunities().map(c => ({
    ...c,
    avatarSvg: c.avatarSvg || renderGenericCommunityAvatar(c.name),
    groups: (c.groups || []).map(g => ({
      ...g,
      avatarSvg: renderSubgroupAvatar(g.avatarType || 'default'),
    })),
  }));

  const builtins = getBuiltinCommunities().map(c => ({
    ...c,
    groups: c.groups.map(g => ({
      ...g,
      avatarSvg: renderSubgroupAvatar(g.avatarType || 'default'),
    })),
  }));

  return [...custom, ...builtins];
}

export function createNewCommunity({ name, description }) {
  const id = `community-${Date.now()}`;
  const avisosId = `${id}-avisos`;
  const newCommunity = {
    id,
    name: name.trim(),
    description: (description || '').trim() || 'Comunidade criada no vorcarozap.',
    membersCount: '1 membro',
    avatarSvg: renderGenericCommunityAvatar(name),
    groups: [
      {
        id: avisosId,
        name: 'Avisos',
        isAnnouncement: true,
        avatarType: 'pink',
        snippet: 'Você criou a comunidade.',
        date: 'agora',
        isUnread: false,
        unreadCount: 0,
        isMuted: false,
        messages: [
          {
            id: `msg-${Date.now()}`,
            system: true,
            text: `Você criou a comunidade "${name.trim()}".`,
            time: 'Agora',
            date: 'Hoje',
          },
        ],
      },
    ],
  };
  saveCustomCommunity(newCommunity);
  return newCommunity;
}

export function findCommunitySelection(communities, targetId) {
  if (!targetId) return null;
  for (const c of communities) {
    if (c.id === targetId) {
      return { type: 'community', community: c, group: null };
    }
    for (const g of c.groups || []) {
      if (g.id === targetId) {
        return { type: 'group', community: c, group: g };
      }
    }
  }
  return null;
}
