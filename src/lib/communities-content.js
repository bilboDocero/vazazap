/**
 * Data and models for Communities (Comunidades).
 * Inspired by WhatsApp Web communities layout and mechanisms.
 */

export const ICON_COMMUNITY_PEOPLE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="7" r="2.8"/><circle cx="4.5" cy="9" r="2.2"/><circle cx="19.5" cy="9" r="2.2"/><path d="M6.5 19v-2.2c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3V19h-11ZM1 18v-2c0-2 1.6-3.4 3.8-3.4.8 0 1.5.2 2.1.5A6 6 0 0 0 4.5 18H1Zm18.5 0a6 6 0 0 0-2.4-4.9c.6-.3 1.3-.5 2.1-.5 2.2 0 3.8 1.4 3.8 3.4v2h-3.5Z"/></svg>`;

export const ICON_MEGAPHONE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.5 4.5a1.2 1.2 0 0 0-1.7-.3L8.2 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2.2l1.6 4.7a1.5 1.5 0 0 0 1.9.9l1.4-.5a1.5 1.5 0 0 0 .9-1.9L12 16.5l5.8 3.4a1.2 1.2 0 0 0 1.7-.3c.4-.6.4-1.4.4-1.9V6.4c0-.5 0-1.3-.4-1.9z"/></svg>`;

export const ICON_MUTE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27l4.66 4.66L7 9.5v5h4l5 5v-6.73l4.25 4.25 1.27-1.27L4.27 3zM14 15.17l-2.45-2.45L14 10.27v4.9z"/></svg>`;

export const ICON_PLUS_CIRCLE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`;

export const ICON_LOCK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`;

export function renderFlutterAvatar() {
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="#0D1117"/>
      <path d="M28.5 7L14 21.5l4.5 4.5L37 11.5 28.5 7z" fill="#54C5F8"/>
      <path d="M28.5 22.8L18.2 33.1l4.5 4.5 10.3-10.3-4.5-4.5z" fill="#29B6F6"/>
      <path d="M22.7 37.6L27.2 42.1 37 32.3l-4.5-4.5-9.8 9.8z" fill="#01579B"/>
      <path d="M22.7 37.6l4.5-4.5 4.5 4.5-4.5 4.5-4.5-4.5z" fill="#00B0FF" opacity="0.8"/>
      <text x="24" y="44.5" font-size="3.6" font-family="system-ui, -apple-system, sans-serif" font-weight="700" fill="#54C5F8" text-anchor="middle" letter-spacing="0.2">FLUTTER EXPERIENCE</text>
    </svg>
  `;
}

export function renderRocketseatAvatar() {
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E2D9F3" stroke-width="1.5"/>
      <path d="M15 17l-5 6 5 6" stroke="#8257E5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M33 17l5 6-5 6" stroke="#8257E5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 15l-6 17" stroke="#8257E5" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}

export function renderTesteAvatar() {
  return `
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" class="community-avatar-svg">
      <rect width="48" height="48" rx="12" fill="#DCEBFF"/>
      <g transform="translate(12, 12)" fill="#1E88E5">
        <circle cx="12" cy="7" r="2.8"/>
        <circle cx="4.5" cy="9" r="2.2"/>
        <circle cx="19.5" cy="9" r="2.2"/>
        <path d="M6.5 19v-2.2c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3V19h-11ZM1 18v-2c0-2 1.6-3.4 3.8-3.4.8 0 1.5.2 2.1.5A6 6 0 0 0 4.5 18H1Zm18.5 0a6 6 0 0 0-2.4-4.9c.6-.3 1.3-.5 2.1-.5 2.2 0 3.8 1.4 3.8 3.4v2h-3.5Z"/>
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
      id: 'adf-inscricoes',
      name: '🔴 ADF - INSCRIÇÕES ABERTAS',
      description: 'Comunidade oficial da formação ADF e Flutter Experience. Acompanhe avisos, novidades, mentorias e eventos exclusivos.',
      membersCount: '1.428 membros',
      avatarSvg: renderFlutterAvatar(),
      groups: [
        {
          id: 'adf-avisos',
          name: 'Avisos',
          isAnnouncement: true,
          avatarType: 'pink',
          snippet: '~R5 Academy: 🚨 🚨 ÚLTIM...',
          date: 'domingo',
          isUnread: true,
          unreadCount: 4,
          isMuted: true,
          messages: [
            {
              id: 'adf-m1',
              sender: '~R5 Academy',
              senderColor: '#1FAF38',
              text: '🚨 🚨 ÚLTIMAS VAGAS PARA O ADF!\n\nAs inscrições para a nova turma do Flutter Experience estão abertas por tempo limitado. Não perca a oportunidade de dominar Flutter do zero ao avançado!\n\nGaranta sua vaga hoje com condições especiais.',
              time: '18:42',
              date: 'Domingo',
            },
            {
              id: 'adf-m2',
              sender: '~R5 Academy',
              senderColor: '#1FAF38',
              text: 'Lembrando que o acesso à plataforma e ao grupo exclusivo de networking será liberado imediatamente após a confirmação da inscrição.',
              time: '18:45',
              date: 'Domingo',
            },
            {
              id: 'adf-m3',
              sender: '~R5 Academy',
              senderColor: '#1FAF38',
              text: 'Plantão de dúvidas aberto com nossos mentores até às 23:59.',
              time: '19:10',
              date: 'Domingo',
            },
            {
              id: 'adf-m4',
              sender: '~R5 Academy',
              senderColor: '#1FAF38',
              text: '🚨 🚨 ÚLTIMAS 5 HORAS! Acesse o link oficial para garantir seu bônus de aceleração de carreira.',
              time: '19:30',
              date: 'Domingo',
            },
          ],
        },
        {
          id: 'adf-geral',
          name: 'ADF · Discussão & Alunos',
          isAnnouncement: false,
          avatarType: 'default',
          snippet: 'Pedro: Alguém conseguiu rodar o build no iOS?',
          date: 'ontem',
          isUnread: false,
          unreadCount: 0,
          isMuted: false,
          messages: [
            {
              id: 'adf-g1',
              sender: 'Pedro',
              senderColor: '#007BFC',
              text: 'Alguém conseguiu rodar o build no iOS com a versão mais recente do Flutter?',
              time: '14:22',
              date: 'Ontem',
            },
            {
              id: 'adf-g2',
              sender: 'Ana Tech',
              senderColor: '#E53935',
              text: 'Sim! Precisa rodar pod repo update antes no diretório ios.',
              time: '14:25',
              date: 'Ontem',
            },
          ],
        },
        {
          id: 'adf-vagas',
          name: 'ADF · Vagas & Oportunidades',
          isAnnouncement: false,
          avatarType: 'default',
          snippet: 'Mariana: Nova vaga de Flutter Sênior remota aberta!',
          date: 'sexta-feira',
          isUnread: false,
          unreadCount: 0,
          isMuted: true,
          messages: [
            {
              id: 'adf-v1',
              sender: 'Mariana',
              senderColor: '#8257E5',
              text: 'Nova vaga de Flutter Sênior remota aberta na fintech parceira. Envie CV com portfólio no privado!',
              time: '11:15',
              date: 'Sexta-feira',
            },
          ],
        },
      ],
    },
    {
      id: 'rocketseat-69',
      name: 'Novidades Rocketseat #69',
      description: 'Comunidade oficial da Rocketseat para a edição #69. Avisos sobre maratonas de código, cursos, mentorias e novidades de tecnologia.',
      membersCount: '3.890 membros',
      avatarSvg: renderRocketseatAvatar(),
      groups: [
        {
          id: 'rocketseat-avisos',
          name: 'Avisos',
          isAnnouncement: true,
          avatarType: 'teal',
          snippet: '+55 47 8835-8251 promoveu ...',
          date: '06/07/2026',
          isUnread: false,
          unreadCount: 0,
          isMuted: true,
          messages: [
            {
              id: 'rs-m1',
              system: true,
              text: '+55 47 8835-8251 promoveu você a administrador desta comunidade.',
              time: '10:05',
              date: '06/07/2026',
            },
            {
              id: 'rs-m2',
              sender: 'Rocketseat Admin',
              senderColor: '#8257E5',
              text: 'Bem-vindos à comunidade Novidades Rocketseat #69!\nAqui compartilharemos todos os anúncios e links das próximas transmissões.',
              time: '10:15',
              date: '06/07/2026',
            },
          ],
        },
        {
          id: 'rocketseat-devs',
          name: 'Rocketseat · Devs #69',
          isAnnouncement: false,
          avatarType: 'default',
          snippet: 'Lucas: Qual stack vocês estão usando no projeto?',
          date: '05/07/2026',
          isUnread: false,
          unreadCount: 0,
          isMuted: true,
          messages: [
            {
              id: 'rs-d1',
              sender: 'Lucas',
              senderColor: '#0063CB',
              text: 'Qual stack vocês estão usando no projeto do evento? React com Vite ou Next.js?',
              time: '17:40',
              date: '05/07/2026',
            },
          ],
        },
      ],
    },
    {
      id: 'teste-community',
      name: 'Teste',
      description: 'Comunidade de testes para validação de grupos e anúncios.',
      membersCount: '12 membros',
      avatarSvg: renderTesteAvatar(),
      groups: [
        {
          id: 'teste-avisos',
          name: 'Avisos',
          isAnnouncement: true,
          avatarType: 'default',
          snippet: 'Você criou a comunidade "Teste"',
          date: 'ontem',
          isUnread: false,
          unreadCount: 0,
          isMuted: false,
          messages: [
            {
              id: 't-m1',
              system: true,
              text: 'Você criou a comunidade "Teste"',
              time: '15:20',
              date: 'Ontem',
            },
          ],
        },
      ],
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
    description: (description || '').trim() || 'Comunidade criada no VorcaroZap.',
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
