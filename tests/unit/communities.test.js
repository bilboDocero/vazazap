import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBuiltinCommunities,
  getCommunitiesData,
  createNewCommunity,
  findCommunitySelection,
} from '../../src/lib/communities-content.js';
import { HashRouter } from '../../src/lib/router.js';

describe('Communities Content & Routing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getBuiltinCommunities', () => {
    it('returns the news communities (journalistic and gossip)', () => {
      const list = getBuiltinCommunities();
      expect(list).toHaveLength(2);

      const names = list.map(c => c.name);
      expect(names).toContain('Caso Vorcaro · Notícias e Documentos');
      expect(names).toContain('Caso Vorcaro · Memes e Resenha');
    });

    it('journalistic community contains sourced announcements with publication dates', () => {
      const list = getBuiltinCommunities();
      const news = list.find(c => c.id === 'plantao-caso-vorcaro');
      expect(news).toBeDefined();

      const avisos = news.groups.find(g => g.id === 'plantao-avisos');
      expect(avisos).toBeDefined();
      expect(avisos.name).toBe('Avisos');
      expect(avisos.date).toBe('14/10/2026');
      expect(avisos.snippet).toContain('PGR');
      expect(avisos.unreadCount).toBe(0);
      expect(avisos.isMuted).toBe(true);
      expect(avisos.messages.length).toBeGreaterThanOrEqual(3);
      expect(avisos.messages.every(msg => msg.sources.length > 0)).toBe(true);
    });

    it('gossip community contains Avisos with date 06/07/2026 and mute flag', () => {
      const list = getBuiltinCommunities();
      const gossip = list.find(c => c.id === 'fofocas-caso-vorcaro');
      expect(gossip).toBeDefined();

      const avisos = gossip.groups.find(g => g.id === 'fofocas-avisos');
      expect(avisos).toBeDefined();
      expect(avisos.name).toBe('Avisos');
      expect(avisos.date).toBe('06/07/2026');
      expect(avisos.snippet).toContain('Equipe da Resenha');
      expect(avisos.isMuted).toBe(true);
    });
  });

  describe('createNewCommunity', () => {
    it('creates and persists a new custom community with Avisos group', () => {
      const created = createNewCommunity({
        name: 'Minha Comunidade Dev',
        description: 'Grupo para testes e discussão',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Minha Comunidade Dev');
      expect(created.description).toBe('Grupo para testes e discussão');
      expect(created.groups).toHaveLength(1);
      expect(created.groups[0].name).toBe('Avisos');

      const all = getCommunitiesData();
      expect(all.some(c => c.id === created.id)).toBe(true);
    });
  });

  describe('findCommunitySelection', () => {
    it('resolves a community by ID', () => {
      const communities = getCommunitiesData();
      const sel = findCommunitySelection(communities, 'plantao-caso-vorcaro');
      expect(sel).toEqual({
        type: 'community',
        community: expect.objectContaining({ id: 'plantao-caso-vorcaro' }),
        group: null,
      });
    });

    it('resolves a subgroup by ID', () => {
      const communities = getCommunitiesData();
      const sel = findCommunitySelection(communities, 'plantao-avisos');
      expect(sel).toEqual({
        type: 'group',
        community: expect.objectContaining({ id: 'plantao-caso-vorcaro' }),
        group: expect.objectContaining({ id: 'plantao-avisos', name: 'Avisos' }),
      });
    });

    it('returns null for unknown ID', () => {
      const communities = getCommunitiesData();
      expect(findCommunitySelection(communities, 'unknown-id')).toBeNull();
      expect(findCommunitySelection(communities, null)).toBeNull();
    });
  });

  describe('HashRouter communities route', () => {
    it('parses #/communities hash without param', () => {
      expect(HashRouter.parseHash('#/communities')).toEqual({
        route: 'communities',
        param: null,
        messageId: null,
      });
    });

    it('parses #/communities/:id hash with param', () => {
      expect(HashRouter.parseHash('#/communities/plantao-avisos')).toEqual({
        route: 'communities',
        param: 'plantao-avisos',
        messageId: null,
      });
    });

    it('navigates to communities route', () => {
      const router = new HashRouter();
      router.navigate('communities');
      expect(window.location.hash).toBe('#/communities');

      router.navigate('communities', 'plantao-avisos');
      expect(window.location.hash).toBe('#/communities/plantao-avisos');
      router.stop();
    });
  });
});
