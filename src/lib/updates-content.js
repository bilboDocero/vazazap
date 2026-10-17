/** Editorial spaces for future simulations. Avatars are not publications. */
export function createUpdatesCatalog(conversations) {
  const self = { id: 'vorcaro', name: 'Daniel Vorcaro', avatar: '/assets/avatar-dv.jpg', conversationId: null };
  const contacts = conversations.filter(c => c.id !== 'dv-self').map(c => ({
    id: c.id,
    name: c.contact || c.participants.find(p => p !== 'DV') || c.id,
    avatar: c.avatar,
    conversationId: c.id,
  }));
  const favoriteIds = ['martha-graeff', 'alexandre-de-moraes', 'fabio-faria', 'vivi-moraes', 'fabiano-zettel', 'ciro-soares'];
  contacts.sort((a, b) => {
    const rank = id => favoriteIds.includes(id) ? favoriteIds.indexOf(id) : favoriteIds.length;
    return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'pt-BR');
  });
  return {
    status: [self, ...contacts],
    channels: [
      { ...self, name: 'Canal do Vorcaro', description: 'Imagens públicas e momentos do banqueiro' },
      ...contacts.map(contact => ({
        ...contact,
        name: `Vorcaro e ${contact.name}`,
        description: 'Imagens públicas com este contato',
      })),
    ],
  };
}

const FOLLOWED_KEY = 'masterwhats:followed-channels';

export function loadFollowedChannels() {
  try {
    const ids = JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]');
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveFollowedChannels(ids) {
  try { localStorage.setItem(FOLLOWED_KEY, JSON.stringify([...ids])); } catch { /* Keep session state when storage is unavailable. */ }
}
