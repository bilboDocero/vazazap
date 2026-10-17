import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateStatusPrice,
  buildSocialLink,
  loadCachedStatuses,
  saveCachedStatuses,
  createStatusPurchase,
  sortStatuses,
  sortStatusesForClient,
  getMyLastPurchasedStatusId,
  setMyLastPurchasedStatusId,
} from '../../src/lib/status-db.js';

describe('Status Purchase & Pricing Calculator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('calculateStatusPrice - Status Normal (R$ 4,90)', () => {
    it('calculates 1 file without discount', () => {
      const p = calculateStatusPrice({ planType: 'status_normal', fileCount: 1 });
      expect(p.unitPrice).toBe(4.90);
      expect(p.fileCount).toBe(1);
      expect(p.grossTotal).toBe(4.90);
      expect(p.discountAmount).toBe(0);
      expect(p.finalTotal).toBe(4.90);
    });

    it('calculates 2 files with 5% discount (R$ 9,30)', () => {
      const p = calculateStatusPrice({ planType: 'status_normal', fileCount: 2 });
      expect(p.fileCount).toBe(2);
      expect(p.grossTotal).toBe(9.80);
      expect(p.discountAmount).toBe(0.50);
      expect(p.finalTotal).toBe(9.30);
    });

    it('calculates 3 files with 10% discount (R$ 13,20)', () => {
      const p = calculateStatusPrice({ planType: 'status_normal', fileCount: 3 });
      expect(p.fileCount).toBe(3);
      expect(p.grossTotal).toBe(14.70);
      expect(p.discountAmount).toBe(1.50);
      expect(p.finalTotal).toBe(13.20);
    });

    it('calculates 4 files with 15% discount (R$ 16,60)', () => {
      const p = calculateStatusPrice({ planType: 'status_normal', fileCount: 4 });
      expect(p.fileCount).toBe(4);
      expect(p.grossTotal).toBe(19.60);
      expect(p.discountAmount).toBe(3.00);
      expect(p.finalTotal).toBe(16.60);
    });
  });

  describe('calculateStatusPrice - Status Impulsionado (R$ 149,00)', () => {
    it('calculates 1 file without discount', () => {
      const p = calculateStatusPrice({ planType: 'status_impulsionado', fileCount: 1 });
      expect(p.unitPrice).toBe(149.00);
      expect(p.fileCount).toBe(1);
      expect(p.finalTotal).toBe(149.00);
    });

    it('calculates 2 files with 7% discount (R$ 277,00)', () => {
      const p = calculateStatusPrice({ planType: 'status_impulsionado', fileCount: 2 });
      expect(p.fileCount).toBe(2);
      expect(p.grossTotal).toBe(298.00);
      expect(p.discountAmount).toBe(21.00);
      expect(p.finalTotal).toBe(277.00);
    });

    it('calculates 3 files with 12% discount (R$ 393,00)', () => {
      const p = calculateStatusPrice({ planType: 'status_impulsionado', fileCount: 3 });
      expect(p.fileCount).toBe(3);
      expect(p.grossTotal).toBe(447.00);
      expect(p.discountAmount).toBe(54.00);
      expect(p.finalTotal).toBe(393.00);
    });

    it('calculates 4 files with 18% discount (R$ 488,00)', () => {
      const p = calculateStatusPrice({ planType: 'status_impulsionado', fileCount: 4 });
      expect(p.fileCount).toBe(4);
      expect(p.grossTotal).toBe(596.00);
      expect(p.discountAmount).toBe(108.00);
      expect(p.finalTotal).toBe(488.00);
    });
  });

  describe('buildSocialLink', () => {
    it('constructs correct URL for Instagram', () => {
      expect(buildSocialLink('instagram', 'mariadev')).toBe('https://instagram.com/mariadev');
      expect(buildSocialLink('instagram', '@mariadev')).toBe('https://instagram.com/mariadev');
    });

    it('constructs correct URL for TikTok', () => {
      expect(buildSocialLink('tiktok', 'mariadev')).toBe('https://tiktok.com/@mariadev');
      expect(buildSocialLink('tiktok', '@mariadev')).toBe('https://tiktok.com/@mariadev');
    });

    it('constructs correct URL for Facebook', () => {
      expect(buildSocialLink('facebook', 'mariadev')).toBe('https://facebook.com/mariadev');
    });

    it('constructs correct URL for Telegram', () => {
      expect(buildSocialLink('telegram', 'mariadev')).toBe('https://t.me/mariadev');
      expect(buildSocialLink('telegram', '@mariadev')).toBe('https://t.me/mariadev');
    });
  });

  describe('Status Storage & Purchase creation', () => {
    it('creates and caches a purchased status with media and approved status', async () => {
      const created = await createStatusPurchase({
        plan_type: 'status_normal',
        file_count: 2,
        unit_price: 4.90,
        discount_amount: 0.50,
        total_price: 9.30,
        profile_name: 'Juliana Silva Tech',
        user_handle: '@julianadev',
        social_network: 'instagram',
        caption: 'Novas mentorias abertas!',
        media_files: [
          { id: '1', name: 'foto1.jpg', url: 'https://example.com/1.jpg' },
          { id: '2', name: 'foto2.jpg', url: 'https://example.com/2.jpg' },
        ],
      });

      expect(created.id).toBeDefined();
      expect(created.payment_status).toBe('approved');
      expect(created.social_link).toBe('https://instagram.com/julianadev');
      expect(created.media_files).toHaveLength(2);

      const cached = loadCachedStatuses();
      expect(cached.some(c => c.id === created.id)).toBe(true);
    });

    it('supports individual captions for each media item', async () => {
      const created = await createStatusPurchase({
        plan_type: 'status_normal',
        file_count: 2,
        unit_price: 4.90,
        discount_amount: 0.50,
        total_price: 9.30,
        profile_name: 'Juliana Silva Tech',
        user_handle: '@julianadev',
        social_network: 'instagram',
        caption: 'Legenda da primeira foto',
        media_files: [
          { id: '1', name: 'foto1.jpg', url: 'https://example.com/1.jpg', caption: 'Legenda da primeira foto' },
          { id: '2', name: 'foto2.jpg', url: 'https://example.com/2.jpg', caption: 'Legenda diferente da segunda foto' },
        ],
      });

      expect(created.media_files[0].caption).toBe('Legenda da primeira foto');
      expect(created.media_files[1].caption).toBe('Legenda diferente da segunda foto');
    });

    it('orders status_impulsionado always at the top and status_normal below', () => {
      const normal1 = { id: 'n1', plan_type: 'status_normal', published_at: '2026-10-17T10:00:00Z' };
      const normal2 = { id: 'n2', plan_type: 'status_normal', published_at: '2026-10-17T12:00:00Z' };
      const boost1 = { id: 'b1', plan_type: 'status_impulsionado', published_at: '2026-10-17T09:00:00Z' };
      const boost2 = { id: 'b2', plan_type: 'status_impulsionado', published_at: '2026-10-17T11:00:00Z' };

      const sorted = sortStatuses([normal1, boost1, normal2, boost2]);

      expect(sorted.map(s => s.id)).toEqual(['b2', 'b1', 'n2', 'n1']);
      expect(sorted[0].plan_type).toBe('status_impulsionado');
      expect(sorted[1].plan_type).toBe('status_impulsionado');
      expect(sorted[2].plan_type).toBe('status_normal');
      expect(sorted[3].plan_type).toBe('status_normal');
    });

    it('places client newly purchased status at the very top (first place) even if normal', () => {
      const normal1 = { id: 'n1', plan_type: 'status_normal', published_at: '2026-10-17T10:00:00Z' };
      const normal2 = { id: 'n2', plan_type: 'status_normal', published_at: '2026-10-17T12:00:00Z' };
      const boost1 = { id: 'b1', plan_type: 'status_impulsionado', published_at: '2026-10-17T09:00:00Z' };
      const boost2 = { id: 'b2', plan_type: 'status_impulsionado', published_at: '2026-10-17T11:00:00Z' };

      // Client recently bought n1
      const clientSorted = sortStatusesForClient([normal1, boost1, normal2, boost2], 'n1');

      // n1 must be first, followed by impulsionados, followed by normal2
      expect(clientSorted.map(s => s.id)).toEqual(['n1', 'b2', 'b1', 'n2']);
    });

    it('falls back to impulsionados first when no recent status was purchased by client', () => {
      const normal1 = { id: 'n1', plan_type: 'status_normal', published_at: '2026-10-17T10:00:00Z' };
      const boost1 = { id: 'b1', plan_type: 'status_impulsionado', published_at: '2026-10-17T09:00:00Z' };

      const clientSorted = sortStatusesForClient([normal1, boost1], null);
      expect(clientSorted.map(s => s.id)).toEqual(['b1', 'n1']);
    });
  });
});
