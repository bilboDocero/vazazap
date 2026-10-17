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
    it('returns the 3 communities from the reference design', () => {
      const list = getBuiltinCommunities();
      expect(list).toHaveLength(3);

      const names = list.map(c => c.name);
      expect(names).toContain('🔴 ADF - INSCRIÇÕES ABERTAS');
      expect(names).toContain('Novidades Rocketseat #69');
      expect(names).toContain('Teste');
    });

    it('ADF community contains Avisos group with 4 unread messages and mute flag', () => {
      const list = getBuiltinCommunities();
      const adf = list.find(c => c.id === 'adf-inscricoes');
      expect(adf).toBeDefined();

      const avisos = adf.groups.find(g => g.id === 'adf-avisos');
      expect(avisos).toBeDefined();
      expect(avisos.name).toBe('Avisos');
      expect(avisos.date).toBe('domingo');
      expect(avisos.snippet).toContain('~R5 Academy: 🚨 🚨 ÚLTIM...');
      expect(avisos.unreadCount).toBe(4);
      expect(avisos.isMuted).toBe(true);
      expect(avisos.messages.length).toBeGreaterThanOrEqual(4);
    });

    it('Rocketseat community contains Avisos with date 06/07/2026 and mute flag', () => {
      const list = getBuiltinCommunities();
      const rs = list.find(c => c.id === 'rocketseat-69');
      expect(rs).toBeDefined();

      const avisos = rs.groups.find(g => g.id === 'rocketseat-avisos');
      expect(avisos).toBeDefined();
      expect(avisos.name).toBe('Avisos');
      expect(avisos.date).toBe('06/07/2026');
      expect(avisos.snippet).toContain('+55 47 8835-8251');
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
      const sel = findCommunitySelection(communities, 'adf-inscricoes');
      expect(sel).toEqual({
        type: 'community',
        community: expect.objectContaining({ id: 'adf-inscricoes' }),
        group: null,
      });
    });

    it('resolves a subgroup by ID', () => {
      const communities = getCommunitiesData();
      const sel = findCommunitySelection(communities, 'adf-avisos');
      expect(sel).toEqual({
        type: 'group',
        community: expect.objectContaining({ id: 'adf-inscricoes' }),
        group: expect.objectContaining({ id: 'adf-avisos', name: 'Avisos' }),
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
      expect(HashRouter.parseHash('#/communities/adf-avisos')).toEqual({
        route: 'communities',
        param: 'adf-avisos',
        messageId: null,
      });
    });

    it('navigates to communities route', () => {
      const router = new HashRouter();
      router.navigate('communities');
      expect(window.location.hash).toBe('#/communities');

      router.navigate('communities', 'adf-avisos');
      expect(window.location.hash).toBe('#/communities/adf-avisos');
      router.stop();
    });
  });
});
