import {
  getStatusPurchases,
  createStatusPurchaseRecord,
  deleteStatusPurchaseRecord,
  getVitrinePurchases,
  createVitrinePurchaseRecord,
  deleteVitrinePurchaseRecord,
  calculateServerPrice,
} from './db.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sanitizeSafeString(str, maxLen = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function validateSocialUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return '';
}

export function statusApiMiddleware(req, res, next) {
  if (!req.url || (!req.url.startsWith('/api/status') && !req.url.startsWith('/api/vitrine'))) {
    return next();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ── STATUS ENDPOINTS ──────────────────────────────────────
  // GET /api/status/purchases
  if (req.method === 'GET' && pathname === '/api/status/purchases') {
    getStatusPurchases()
      .then(rows => {
        sendJson(res, 200, { ok: true, purchases: rows });
      })
      .catch(err => {
        console.error('[Supabase Status GET Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message, purchases: [] });
      });
    return;
  }

  // POST /api/status/purchase
  if (req.method === 'POST' && pathname === '/api/status/purchase') {
    readJsonBody(req)
      .then(body => {
        const id = sanitizeSafeString(body.id, 100) || `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const planType = body.plan_type === 'status_impulsionado' ? 'status_impulsionado' : 'status_normal';
        const fileCount = Math.min(Math.max(Number(body.file_count) || 1, 1), 4);
        
        // Recalculate verified price on server side
        const verifiedPrice = calculateServerPrice({ planType, fileCount });
        const unitPrice = verifiedPrice.unitPrice;
        const discountAmount = verifiedPrice.discountAmount;
        const totalPrice = verifiedPrice.finalTotal;

        const paymentStatus = 'approved';
        const profileName = sanitizeSafeString(body.profile_name, 100) || 'Usuário';
        const userHandle = sanitizeSafeString(body.user_handle, 60) || '@user';
        const socialNetwork = ['instagram', 'tiktok', 'facebook', 'telegram'].includes(body.social_network)
          ? body.social_network
          : 'instagram';
        const socialLink = validateSocialUrl(body.social_link) || `https://instagram.com/${userHandle.replace(/^@/, '')}`;
        const caption = sanitizeSafeString(body.caption, 500) || '';
        const profilePic = typeof body.profile_pic === 'string' ? body.profile_pic : '';
        const mediaFiles = Array.isArray(body.media_files) ? body.media_files.slice(0, 4) : [];

        return createStatusPurchaseRecord({
          id,
          plan_type: planType,
          file_count: fileCount,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          total_price: totalPrice,
          payment_status: paymentStatus,
          profile_name: profileName,
          user_handle: userHandle,
          social_network: socialNetwork,
          social_link: socialLink,
          caption,
          profile_pic: profilePic,
          media_files: mediaFiles,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      })
      .then(created => {
        sendJson(res, 201, { ok: true, purchase: created });
      })
      .catch(err => {
        console.error('[Supabase Status Purchase Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // DELETE /api/status/purchase/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/status/purchase/')) {
    const id = sanitizeSafeString(pathname.replace('/api/status/purchase/', ''), 100);
    deleteStatusPurchaseRecord(id)
      .then(deleted => {
        sendJson(res, 200, { ok: true, deleted });
      })
      .catch(err => {
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // ── VITRINE ENDPOINTS ─────────────────────────────────────
  // GET /api/vitrine/purchases
  if (req.method === 'GET' && pathname === '/api/vitrine/purchases') {
    getVitrinePurchases()
      .then(rows => {
        sendJson(res, 200, { ok: true, purchases: rows });
      })
      .catch(err => {
        console.error('[Supabase Vitrine GET Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message, purchases: [] });
      });
    return;
  }

  // POST /api/vitrine/purchase
  if (req.method === 'POST' && pathname === '/api/vitrine/purchase') {
    readJsonBody(req)
      .then(body => {
        const id = sanitizeSafeString(body.id, 100) || `vitrine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const planType = body.plan_type === 'vitrine_impulsionado' ? 'vitrine_impulsionado' : 'vitrine_normal';
        const fileCount = Math.min(Math.max(Number(body.file_count) || 1, 1), 4);
        
        // Recalculate verified price on server side
        const verifiedPrice = calculateServerPrice({ planType, fileCount });
        const unitPrice = verifiedPrice.unitPrice;
        const discountAmount = verifiedPrice.discountAmount;
        const totalPrice = verifiedPrice.finalTotal;

        const paymentStatus = 'approved';
        const profileName = sanitizeSafeString(body.profile_name, 100) || 'Vitrine Comercial';
        const userHandle = sanitizeSafeString(body.user_handle, 60) || '@vitrine';
        const socialNetwork = ['instagram', 'tiktok', 'facebook', 'telegram'].includes(body.social_network)
          ? body.social_network
          : 'instagram';
        const socialLink = validateSocialUrl(body.social_link) || `https://instagram.com/${userHandle.replace(/^@/, '')}`;
        const caption = sanitizeSafeString(body.caption, 500) || '';
        const profilePic = typeof body.profile_pic === 'string' ? body.profile_pic : '';
        const mediaFiles = Array.isArray(body.media_files) ? body.media_files.slice(0, 4) : [];

        return createVitrinePurchaseRecord({
          id,
          plan_type: planType,
          file_count: fileCount,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          total_price: totalPrice,
          payment_status: paymentStatus,
          profile_name: profileName,
          user_handle: userHandle,
          social_network: socialNetwork,
          social_link: socialLink,
          caption,
          profile_pic: profilePic,
          media_files: mediaFiles,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      })
      .then(created => {
        sendJson(res, 201, { ok: true, purchase: created });
      })
      .catch(err => {
        console.error('[Supabase Vitrine Purchase Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // DELETE /api/vitrine/purchase/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/vitrine/purchase/')) {
    const id = sanitizeSafeString(pathname.replace('/api/vitrine/purchase/', ''), 100);
    deleteVitrinePurchaseRecord(id)
      .then(deleted => {
        sendJson(res, 200, { ok: true, deleted });
      })
      .catch(err => {
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  next();
}
