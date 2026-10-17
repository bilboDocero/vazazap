import {
  getStatusPurchases,
  createStatusPurchaseRecord,
  deleteStatusPurchaseRecord,
  getStatusPurchaseById,
  updateStatusPurchasePayment,
  getVitrinePurchases,
  createVitrinePurchaseRecord,
  deleteVitrinePurchaseRecord,
  getVitrinePurchaseById,
  updateVitrinePurchasePayment,
  calculateServerPrice,
} from './db.js';

import {
  findOrCreateCustomer,
  createPixPayment,
  createCreditCardPayment,
  getPaymentStatus,
  getAsaasConfig,
} from './asaas.js';

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
  if (
    !req.url ||
    (!req.url.startsWith('/api/status') &&
     !req.url.startsWith('/api/vitrine') &&
     !req.url.startsWith('/api/payment') &&
     !req.url.startsWith('/api/webhook'))
  ) {
    return next();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ── PAYMENT CREATION (PIX & CARTÃO DE CRÉDITO) ─────────────
  // POST /api/payment/create
  if (req.method === 'POST' && pathname === '/api/payment/create') {
    readJsonBody(req)
      .then(async body => {
        const type = body.type === 'vitrine' ? 'vitrine' : 'status';
        const billingType = body.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';
        const planType = body.plan_type || (type === 'vitrine' ? 'vitrine_normal' : 'status_normal');
        const fileCount = Math.min(Math.max(Number(body.file_count) || 1, 1), 4);

        const verifiedPrice = calculateServerPrice({ planType, fileCount });
        const value = verifiedPrice.finalTotal;

        const recordId = sanitizeSafeString(body.id, 100) || `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const customerData = body.customer || {};

        // 1. Find or create customer in Asaas
        const customerId = await findOrCreateCustomer({
          name: customerData.name || body.profile_name || 'Anunciante VorcaroZap',
          cpfCnpj: customerData.cpfCnpj,
          email: customerData.email,
          phone: customerData.phone,
        });

        // 2. Prepare description & external reference
        const description = `VorcaroZap - ${type === 'vitrine' ? 'Vitrine Comercial' : 'Status/Stories'} (${planType})`;
        const externalReference = `${type}:${recordId}`;
        const remoteIp = req.socket?.remoteAddress || '127.0.0.1';

        let paymentResult = null;
        let paymentStatus = 'pending';

        if (billingType === 'PIX') {
          paymentResult = await createPixPayment({
            customerId,
            value,
            description,
            externalReference,
          });
          paymentStatus = 'pending';
        } else {
          // CREDIT_CARD
          paymentResult = await createCreditCardPayment({
            customerId,
            value,
            description,
            externalReference,
            remoteIp,
            creditCard: body.creditCard || {},
            creditCardHolderInfo: body.creditCardHolderInfo || {
              name: customerData.name || body.profile_name,
              email: customerData.email || 'cliente@vorcarozap.com',
              cpfCnpj: customerData.cpfCnpj || '00000000000',
              postalCode: body.creditCardHolderInfo?.postalCode || '01001-000',
              addressNumber: body.creditCardHolderInfo?.addressNumber || '1',
              phone: customerData.phone || '11999999999',
            },
          });

          if (paymentResult.payment?.status === 'CONFIRMED' || paymentResult.payment?.status === 'RECEIVED') {
            paymentStatus = 'approved';
          } else {
            paymentStatus = 'pending';
          }
        }

        // 3. Save initial record to database
        const recordPayload = {
          id: recordId,
          plan_type: planType,
          file_count: fileCount,
          unit_price: verifiedPrice.unitPrice,
          discount_amount: verifiedPrice.discountAmount,
          total_price: verifiedPrice.finalTotal,
          payment_status: paymentStatus,
          profile_name: sanitizeSafeString(body.profile_name, 100) || 'Anunciante',
          user_handle: sanitizeSafeString(body.user_handle, 60) || '@user',
          social_network: ['instagram', 'tiktok', 'facebook', 'telegram'].includes(body.social_network) ? body.social_network : 'instagram',
          social_link: validateSocialUrl(body.social_link) || 'https://instagram.com',
          caption: sanitizeSafeString(body.caption, 500) || '',
          profile_pic: typeof body.profile_pic === 'string' ? body.profile_pic : '',
          media_files: Array.isArray(body.media_files) ? body.media_files.slice(0, 4) : [],
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        let createdRecord = null;
        if (type === 'vitrine') {
          createdRecord = await createVitrinePurchaseRecord(recordPayload);
        } else {
          createdRecord = await createStatusPurchaseRecord(recordPayload);
        }

        sendJson(res, 201, {
          ok: true,
          type,
          billingType,
          paymentId: paymentResult.payment?.id,
          paymentStatus,
          pix: paymentResult.pix || null,
          purchase: createdRecord,
        });
      })
      .catch(err => {
        console.error('[Payment Create Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // ── PAYMENT STATUS POLLING ─────────────────────────────────
  // GET /api/payment/status?paymentId=...&recordId=...&type=...
  if (req.method === 'GET' && pathname === '/api/payment/status') {
    const paymentId = url.searchParams.get('paymentId');
    const recordId = url.searchParams.get('recordId');
    const type = url.searchParams.get('type') || 'status';

    if (!paymentId) {
      sendJson(res, 400, { ok: false, error: 'paymentId is required' });
      return;
    }

    getPaymentStatus(paymentId)
      .then(async statusInfo => {
        if (statusInfo.isPaid && recordId) {
          if (type === 'vitrine') {
            await updateVitrinePurchasePayment(recordId, { payment_status: 'approved' });
          } else {
            await updateStatusPurchasePayment(recordId, { payment_status: 'approved' });
          }
        }

        sendJson(res, 200, {
          ok: true,
          paymentId,
          isPaid: statusInfo.isPaid,
          status: statusInfo.status,
          billingType: statusInfo.billingType,
          simulated: statusInfo.simulated || false,
        });
      })
      .catch(err => {
        console.error('[Payment Status Check Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // ── ASAAS WEBHOOK ──────────────────────────────────────────
  // POST /api/webhook/asaas
  if (req.method === 'POST' && pathname === '/api/webhook/asaas') {
    const config = getAsaasConfig();
    const tokenHeader = req.headers['asaas-access-token'];
    if (config.webhookSecret && tokenHeader !== config.webhookSecret) {
      sendJson(res, 401, { ok: false, error: 'Invalid webhook token' });
      return;
    }

    readJsonBody(req)
      .then(async eventData => {
        const eventType = eventData.event;
        const payment = eventData.payment;

        if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType) && payment) {
          const extRef = payment.externalReference || '';
          const [type, recordId] = extRef.split(':');
          if (recordId) {
            if (type === 'vitrine') {
              await updateVitrinePurchasePayment(recordId, { payment_status: 'approved' });
            } else {
              await updateStatusPurchasePayment(recordId, { payment_status: 'approved' });
            }
          }
        }

        sendJson(res, 200, { ok: true, received: true });
      })
      .catch(err => {
        console.error('[Asaas Webhook Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

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
        
        const verifiedPrice = calculateServerPrice({ planType, fileCount });
        const unitPrice = verifiedPrice.unitPrice;
        const discountAmount = verifiedPrice.discountAmount;
        const totalPrice = verifiedPrice.finalTotal;

        const paymentStatus = body.payment_status || 'approved';
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
        
        const verifiedPrice = calculateServerPrice({ planType, fileCount });
        const unitPrice = verifiedPrice.unitPrice;
        const discountAmount = verifiedPrice.discountAmount;
        const totalPrice = verifiedPrice.finalTotal;

        const paymentStatus = body.payment_status || 'approved';
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
