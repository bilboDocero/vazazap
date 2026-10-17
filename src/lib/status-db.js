/**
 * Status purchasing and PostgreSQL / LocalStorage synchronization layer.
 */

export const SOCIAL_NETWORKS = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    prefix: '@',
    placeholder: 'ex: mariasilva',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    buildLink: (user) => `https://instagram.com/${cleanUsername(user)}`,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    color: '#000000',
    prefix: '@',
    placeholder: 'ex: mariasilva',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    buildLink: (user) => `https://tiktok.com/@${cleanUsername(user)}`,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    prefix: '',
    placeholder: 'ex: mariasilva.oficial',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    buildLink: (user) => `https://facebook.com/${cleanUsername(user)}`,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    color: '#229ED9',
    prefix: '@',
    placeholder: 'ex: mariasilva',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
    buildLink: (user) => `https://t.me/${cleanUsername(user)}`,
  },
};

function cleanUsername(raw) {
  if (!raw) return '';
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

export function buildSocialLink(networkId, username) {
  const net = SOCIAL_NETWORKS[networkId] || SOCIAL_NETWORKS.instagram;
  return net.buildLink(username);
}

/**
 * Progressive discount calculation:
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
export function calculateStatusPrice({ planType = 'status_normal', fileCount = 1 }) {
  const count = Math.min(Math.max(Number(fileCount) || 1, 1), 4);
  const isImpulsionado = planType === 'status_impulsionado';

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

const LOCAL_STORAGE_KEY = 'vorcarozap:published_status';

export function loadCachedStatuses() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedStatuses(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage issues
  }
}

export async function fetchPublishedStatuses() {
  const isBrowser = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('about:');
  if (isBrowser) {
    try {
      const res = await fetch('/api/status/purchases');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.purchases)) {
          saveCachedStatuses(data.purchases);
          return data.purchases;
        }
      }
    } catch {
      // Server not available, return cached
    }
  }
  return loadCachedStatuses();
}

export async function createStatusPurchase(payload) {
  const localList = loadCachedStatuses();
  const createdRecord = {
    id: payload.id || `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    plan_type: payload.plan_type || 'status_normal',
    file_count: payload.file_count || 1,
    unit_price: payload.unit_price,
    discount_amount: payload.discount_amount,
    total_price: payload.total_price,
    payment_status: 'approved',
    profile_name: payload.profile_name || 'Usuário',
    user_handle: payload.user_handle || '@user',
    social_network: payload.social_network || 'instagram',
    social_link: payload.social_link || buildSocialLink(payload.social_network, payload.user_handle),
    caption: payload.caption || '',
    profile_pic: payload.profile_pic || '',
    media_files: payload.media_files || [],
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Add to local list immediately
  localList.unshift(createdRecord);
  saveCachedStatuses(localList);

  const isBrowser = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('about:');
  if (isBrowser) {
    try {
      const res = await fetch('/api/status/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.purchase) {
          const updated = localList.map(item => item.id === createdRecord.id ? data.purchase : item);
          saveCachedStatuses(updated);
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('status:published', { detail: data.purchase }));
          }
          return data.purchase;
        }
      }
    } catch {
      // Offline fallback
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('status:published', { detail: createdRecord }));
  }
  return createdRecord;
}
