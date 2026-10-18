import { confirmPurchase } from './purchase-api.js';
/**
 * Vitrine purchasing and PostgreSQL / LocalStorage synchronization layer.
 * Exact counterpart of status-db.js for the Vitrine product.
 */

import { SOCIAL_NETWORKS, buildSocialLink } from './status-db.js';
import { idbGet, idbSet } from './idb-storage.js';

export { SOCIAL_NETWORKS, buildSocialLink };

/**
 * Progressive discount calculation for Vitrine:
 * Normal:
 * 1 file: R$ 4,90 (0% desc)
 * 2 files: R$ 9,80 - R$ 0,50 (5%) = R$ 9,30
 * 3 files: R$ 14,70 - R$ 1,50 (10%) = R$ 13,20
 * 4 files: R$ 19,60 - R$ 3,00 (15%) = R$ 16,60
 *
 * Impulsionado:
 * 1 file: R$ 149,00 (0% desc)
 * 2 files: R$ 298,00 - R$ 21,00 (7%) = R$ 277,00
 * 3 files: R$ 447,00 - R$ 54,00 (12%) = R$ 393,00
 * 4 files: R$ 596,00 - R$ 108,00 (18%) = R$ 488,00
 */
export function calculateVitrinePrice({ planType = 'vitrine_normal', fileCount = 1 }) {
  const count = Math.min(Math.max(Number(fileCount) || 1, 1), 4);
  const isImpulsionado = planType === 'vitrine_impulsionado';

  const unitPrice = isImpulsionado ? 149.00 : 4.90;
  const grossTotal = Math.round(unitPrice * count * 100) / 100;

  let discountPercent = 0;
  let discountAmount = 0;

  if (isImpulsionado) {
    if (count === 2) { discountPercent = 7; discountAmount = 21.00; }
    else if (count === 3) { discountPercent = 12; discountAmount = 54.00; }
    else if (count === 4) { discountPercent = 18; discountAmount = 108.00; }
  } else {
    if (count === 2) { discountPercent = 5; discountAmount = 0.50; }
    else if (count === 3) { discountPercent = 10; discountAmount = 1.50; }
    else if (count === 4) { discountPercent = 15; discountAmount = 3.00; }
  }

  const finalTotal = Math.round(Math.max(0, grossTotal - discountAmount) * 100) / 100;

  return {
    planType,
    fileCount: count,
    unitPrice,
    grossTotal,
    discountAmount,
    discountPercent,
    finalTotal,
    formattedUnit: formatCurrency(unitPrice),
    formattedGross: formatCurrency(grossTotal),
    formattedDiscount: formatCurrency(discountAmount),
    formattedTotal: formatCurrency(finalTotal),
  };
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

const LOCAL_STORAGE_KEY = 'vorcarozap:verified_vitrines:v2';

/**
 * Sorts vitrines so impulsionados always stay at the top,
 * and normal vitrines are positioned below, ordered by published_at DESC.
 */
export function sortVitrines(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aBoost = a.plan_type === 'vitrine_impulsionado' ? 0 : 1;
    const bBoost = b.plan_type === 'vitrine_impulsionado' ? 0 : 1;
    if (aBoost !== bBoost) return aBoost - bBoost;
    return new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0);
  });
}

let memoryVitrines = null;
let idbHydratedVitrines = false;

export function loadCachedVitrines() {
  if (memoryVitrines !== null) {
    return memoryVitrines;
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    memoryVitrines = sortVitrines(parsed);
  } catch {
    memoryVitrines = [];
  }

  if (!idbHydratedVitrines && typeof window !== 'undefined') {
    idbHydratedVitrines = true;
    idbGet(LOCAL_STORAGE_KEY).then(idbList => {
      if (Array.isArray(idbList) && idbList.length > 0) {
        memoryVitrines = sortVitrines(idbList);
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('vitrine:cache-updated', { detail: memoryVitrines }));
        }
      }
    }).catch(() => {});
  }

  return memoryVitrines;
}

export function saveCachedVitrines(list) {
  const sorted = sortVitrines(list);
  memoryVitrines = sorted;

  // Primary quota-free persistence in IndexedDB
  idbSet(LOCAL_STORAGE_KEY, sorted).catch(() => {});

  // Best-effort synchronous persistence in localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    try {
      // Strip heavy data: URLs to prevent QuotaExceededError while retaining metadata
      const lightweight = sorted.map(s => ({
        ...s,
        profile_pic: s.profile_pic && s.profile_pic.startsWith('data:') ? '' : s.profile_pic,
        media_files: (s.media_files || []).map(m => ({
          ...m,
          url: m.url && m.url.startsWith('data:') ? '' : m.url,
        })),
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // Ignore storage issues
    }
  }
}

export async function fetchPublishedVitrines() {
  const isBrowser = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('about:');
  if (isBrowser) {
    try {
      const res = await fetch('/api/vitrine/purchases');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.purchases)) {
          const sorted = sortVitrines(data.purchases);
          saveCachedVitrines(sorted);
          return sorted;
        }
      }
    } catch {
      // Server not available, return cached
    }
  }
  return loadCachedVitrines();
}

export async function createVitrinePurchase(payload) {
  const purchase = await confirmPurchase('vitrine', payload);
  const list = loadCachedVitrines();
  saveCachedVitrines([purchase, ...list.filter(row => row.id !== purchase.id)]);
  
  window.dispatchEvent(new CustomEvent('vitrine:published', { detail: purchase }));
  return purchase;
}
