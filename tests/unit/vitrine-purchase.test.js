import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateVitrinePrice,
  loadCachedVitrines,
  saveCachedVitrines,
  createVitrinePurchase,
  sortVitrines,
} from '../../src/lib/vitrine-db.js';

describe('Vitrine Purchase & Pricing Calculator (Counterpart of Status)', () => {
  beforeEach(() => {
    localStorage.clear();
    saveCachedVitrines([]);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('calculateVitrinePrice - Vitrine Normal (R$ 4,90)', () => {
    it('calculates 1 file without discount', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_normal', fileCount: 1 });
      expect(p.unitPrice).toBe(4.90);
      expect(p.fileCount).toBe(1);
      expect(p.grossTotal).toBe(4.90);
      expect(p.discountAmount).toBe(0);
      expect(p.finalTotal).toBe(4.90);
    });

    it('calculates 2 files with 5% discount (R$ 9,30)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_normal', fileCount: 2 });
      expect(p.fileCount).toBe(2);
      expect(p.grossTotal).toBe(9.80);
      expect(p.discountAmount).toBe(0.50);
      expect(p.finalTotal).toBe(9.30);
    });

    it('calculates 3 files with 10% discount (R$ 13,20)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_normal', fileCount: 3 });
      expect(p.fileCount).toBe(3);
      expect(p.grossTotal).toBe(14.70);
      expect(p.discountAmount).toBe(1.50);
      expect(p.finalTotal).toBe(13.20);
    });

    it('calculates 4 files with 15% discount (R$ 16,60)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_normal', fileCount: 4 });
      expect(p.fileCount).toBe(4);
      expect(p.grossTotal).toBe(19.60);
      expect(p.discountAmount).toBe(3.00);
      expect(p.finalTotal).toBe(16.60);
    });
  });

  describe('calculateVitrinePrice - Vitrine Impulsionada (R$ 149,00)', () => {
    it('calculates 1 file without discount', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_impulsionado', fileCount: 1 });
      expect(p.unitPrice).toBe(149.00);
      expect(p.fileCount).toBe(1);
      expect(p.finalTotal).toBe(149.00);
    });

    it('calculates 2 files with 7% discount (R$ 277,00)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_impulsionado', fileCount: 2 });
      expect(p.fileCount).toBe(2);
      expect(p.grossTotal).toBe(298.00);
      expect(p.discountAmount).toBe(21.00);
      expect(p.finalTotal).toBe(277.00);
    });

    it('calculates 3 files with 12% discount (R$ 393,00)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_impulsionado', fileCount: 3 });
      expect(p.fileCount).toBe(3);
      expect(p.grossTotal).toBe(447.00);
      expect(p.discountAmount).toBe(54.00);
      expect(p.finalTotal).toBe(393.00);
    });

    it('calculates 4 files with 18% discount (R$ 488,00)', () => {
      const p = calculateVitrinePrice({ planType: 'vitrine_impulsionado', fileCount: 4 });
      expect(p.fileCount).toBe(4);
      expect(p.grossTotal).toBe(596.00);
      expect(p.discountAmount).toBe(108.00);
      expect(p.finalTotal).toBe(488.00);
    });
  });

  describe('sortVitrines', () => {
    it('orders vitrine_impulsionado always at the top and vitrine_normal below', () => {
      const normal1 = { id: 'vn1', plan_type: 'vitrine_normal', published_at: '2026-10-17T10:00:00Z' };
      const normal2 = { id: 'vn2', plan_type: 'vitrine_normal', published_at: '2026-10-17T12:00:00Z' };
      const boost1 = { id: 'vb1', plan_type: 'vitrine_impulsionado', published_at: '2026-10-17T09:00:00Z' };
      const boost2 = { id: 'vb2', plan_type: 'vitrine_impulsionado', published_at: '2026-10-17T11:00:00Z' };

      const sorted = sortVitrines([normal1, boost1, normal2, boost2]);

      expect(sorted.map(s => s.id)).toEqual(['vb2', 'vb1', 'vn2', 'vn1']);
      expect(sorted[0].plan_type).toBe('vitrine_impulsionado');
      expect(sorted[1].plan_type).toBe('vitrine_impulsionado');
      expect(sorted[2].plan_type).toBe('vitrine_normal');
      expect(sorted[3].plan_type).toBe('vitrine_normal');
    });
  });

  describe('Vitrine Storage & Purchase creation', () => {
    it('creates and caches a purchased vitrine with media and approved status', async () => {
      const serverPurchase = {
        plan_type: 'vitrine_normal',
        file_count: 2,
        unit_price: 4.90,
        discount_amount: 0.50,
        total_price: 9.30,
        profile_name: 'Loja Conceito SP',
        user_handle: '@lojaconceitosp',
        social_network: 'instagram',
        caption: 'Coleção Exclusiva de Primavera',
        media_files: [
          { id: '1', name: 'produto1.jpg', url: 'https://example.com/p1.jpg', caption: 'Produto 1 em destaque' },
          { id: '2', name: 'produto2.jpg', url: 'https://example.com/p2.jpg', caption: 'Produto 2 lançamento' },
        ],
        id: 'verified-purchase', payment_status: 'approved',
        social_link: 'https://instagram.com/lojaconceitosp',
      };
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, purchase: serverPurchase }) });
      const created = await createVitrinePurchase({ id: serverPurchase.id, payment_id: 'cs_test_verified', purchase_token: 'a'.repeat(32) });

      expect(created.id).toBeDefined();
      expect(created.payment_status).toBe('approved');
      expect(created.social_link).toBe('https://instagram.com/lojaconceitosp');
      expect(created.media_files).toHaveLength(2);
      expect(created.media_files[0].caption).toBe('Produto 1 em destaque');

      const cached = loadCachedVitrines();
      expect(cached.some(c => c.id === created.id)).toBe(true);
    });
  });
  it('never publishes or caches an offline or rejected purchase', async () => {
    fetch.mockRejectedValueOnce(new Error('Offline'));
    await expect(createVitrinePurchase({ id: 'offline', payment_status: 'approved' })).rejects.toThrow('Offline');
    expect(loadCachedVitrines()).toEqual([]);
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false, error: 'Pagamento pendente' }) });
    await expect(createVitrinePurchase({ id: 'unpaid', payment_status: 'approved' })).rejects.toThrow('Pagamento pendente');
    expect(loadCachedVitrines()).toEqual([]);
  });

});
