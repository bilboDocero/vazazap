import {
  createStatusPurchaseRecord,
  deleteStatusPurchaseRecord,
  calculateServerPrice,
} from '../../server/db.js';

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const id = sanitizeSafeString(body.id, 100) || `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const planType = body.plan_type === 'status_impulsionado' ? 'status_impulsionado' : 'status_normal';
      const fileCount = Math.min(Math.max(Number(body.file_count) || 1, 1), 4);

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

      const created = await createStatusPurchaseRecord({
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

      res.statusCode = 201;
      return res.end(JSON.stringify({ ok: true, purchase: created }));
    } catch (err) {
      console.error('[Supabase Status POST Error]', err.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const id = sanitizeSafeString(url.searchParams.get('id') || url.pathname.split('/').pop(), 100);
      const deleted = await deleteStatusPurchaseRecord(id);
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, deleted }));
    } catch (err) {
      console.error('[Supabase Status DELETE Error]', err.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
}
