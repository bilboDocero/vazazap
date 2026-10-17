import { describe, it, expect, beforeEach } from 'vitest';
import {
  PLATFORM_PRODUCTS,
  COMMERCIAL_TOOLS_SECTIONS,
  loadCommercialPurchases,
  saveCommercialPurchase,
  getVitrinesCatalog,
  loadFollowedVitrines,
  saveFollowedVitrines,
} from '../../src/lib/commercial-content.js';
import { HashRouter } from '../../src/lib/router.js';

describe('Commercial Content, Products & Routing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('PLATFORM_PRODUCTS', () => {
    it('has exactly 4 products with the specified tabs', () => {
      expect(PLATFORM_PRODUCTS).toHaveLength(4);

      const [statusProd, channelProd, communityProd, vitrineProd] = PLATFORM_PRODUCTS;

      expect(statusProd.name).toBe('Meu status');
      expect(statusProd.targetRoute).toBe('status');
      expect(statusProd.tabName).toBe('Status');

      expect(channelProd.name).toBe('Meu canal');
      expect(channelProd.targetRoute).toBe('channels');
      expect(channelProd.tabName).toBe('Canais');

      expect(communityProd.name).toBe('Minha comunidade');
      expect(communityProd.targetRoute).toBe('communities');
      expect(communityProd.tabName).toBe('Comunidade');

      expect(vitrineProd.name).toBe('Minha vitrine');
      expect(vitrineProd.targetRoute).toBe('vitrine');
      expect(vitrineProd.tabName).toBe('Vitrine');
    });

    it('all 4 products have features, pricing, and primary/secondary CTAs', () => {
      PLATFORM_PRODUCTS.forEach((product) => {
        expect(product.id).toBeDefined();
        expect(product.description).toContain(product.tabName);
        expect(product.features.length).toBeGreaterThanOrEqual(3);
        expect(product.price).toBeDefined();
        expect(product.ctaPrimary).toBeDefined();
        expect(product.ctaSecondary).toBeDefined();
      });
    });
  });

  describe('COMMERCIAL_TOOLS_SECTIONS', () => {
    it('matches the WhatsApp Business reference image sections and items', () => {
      expect(COMMERCIAL_TOOLS_SECTIONS).toHaveLength(2);

      const sec1 = COMMERCIAL_TOOLS_SECTIONS[0];
      expect(sec1.title).toBe('Ferramentas comerciais');
      const itemNames1 = sec1.items.map(i => i.name);
      expect(itemNames1).toEqual(['Perfil comercial', 'Catálogo', 'Cobranças', 'Pagamentos']);

      const sec2 = COMMERCIAL_TOOLS_SECTIONS[1];
      expect(sec2.title).toBe('Conecte-se com mais clientes');
      const itemNames2 = sec2.items.map(i => i.name);
      expect(itemNames2).toEqual(['Anunciar', 'Transmissão comercial']);
    });
  });

  describe('getVitrinesCatalog (similar to Canais)', () => {
    it('returns own vitrine and partner vitrines with products', () => {
      const catalog = getVitrinesCatalog();
      expect(catalog.self).toBeDefined();
      expect(catalog.self.id).toBe('vorcaro-vitrine');
      expect(catalog.self.name).toContain('Daniel Vorcaro');
      expect(catalog.self.products.length).toBeGreaterThanOrEqual(2);

      expect(catalog.vitrines.length).toBeGreaterThan(1);
      const martha = catalog.vitrines.find(v => v.id === 'martha-lifestyle');
      expect(martha).toBeDefined();
      expect(martha.conversationId).toBe('martha-graeff');
      expect(martha.products.length).toBeGreaterThanOrEqual(1);
    });

    it('manages followed vitrines in localStorage', () => {
      expect(loadFollowedVitrines().size).toBe(0);

      const set = new Set(['martha-lifestyle', 'master-asset']);
      saveFollowedVitrines(set);

      const loaded = loadFollowedVitrines();
      expect(loaded.has('martha-lifestyle')).toBe(true);
      expect(loaded.has('master-asset')).toBe(true);
      expect(loaded.has('other')).toBe(false);
    });
  });

  describe('Commercial purchases storage', () => {
    it('saves and loads product activation/purchase records', () => {
      expect(loadCommercialPurchases()).toEqual([]);

      saveCommercialPurchase('product-status');
      expect(loadCommercialPurchases()).toEqual(['product-status']);

      saveCommercialPurchase('product-vitrine');
      expect(loadCommercialPurchases()).toContain('product-status');
      expect(loadCommercialPurchases()).toContain('product-vitrine');
    });
  });

  describe('HashRouter commercial routes', () => {
    it('parses #/vitrine and #/anunciar routes', () => {
      expect(HashRouter.parseHash('#/vitrine')).toEqual({
        route: 'vitrine',
        param: null,
        messageId: null,
      });

      expect(HashRouter.parseHash('#/anunciar')).toEqual({
        route: 'anunciar',
        param: null,
        messageId: null,
      });

      expect(HashRouter.parseHash('#/vitrine/catalogo')).toEqual({
        route: 'vitrine',
        param: 'catalogo',
        messageId: null,
      });
    });

    it('navigates to vitrine and anunciar routes', () => {
      const router = new HashRouter();
      router.navigate('vitrine');
      expect(window.location.hash).toBe('#/vitrine');

      router.navigate('anunciar');
      expect(window.location.hash).toBe('#/anunciar');

      router.stop();
    });
  });
});
