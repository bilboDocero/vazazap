import {
  createStatusPurchaseRecord,
  createVitrinePurchaseRecord,
  calculateServerPrice,
} from '../../server/db.js';

import {
  getStripeConfig,
  createStripePixPayment,
  createStripeCardPayment,
} from '../../server/stripe.js';

import {
  getAsaasConfig,
  findOrCreateCustomer,
  createPixPayment as createAsaasPix,
  createCreditCardPayment as createAsaasCard,
} from '../../server/asaas.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const body = await readBody(req);
    const type = body.type === 'vitrine' ? 'vitrine' : 'status';
    const billingType = body.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';
    const planType = body.plan_type || (type === 'vitrine' ? 'vitrine_normal' : 'status_normal');
    const fileCount = Math.min(Math.max(Number(body.file_count) || 1, 1), 4);

    const verifiedPrice = calculateServerPrice({ planType, fileCount });
    const value = verifiedPrice.finalTotal;

    const recordId = sanitizeSafeString(body.id, 100) || `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const customerData = body.customer || {};
    const customerName = customerData.name || body.profile_name || 'Anunciante VorcaroZap';
    const description = `VorcaroZap - ${type === 'vitrine' ? 'Vitrine Comercial' : 'Status/Stories'} (${planType})`;

    const stripeConfig = getStripeConfig();
    const asaasConfig = getAsaasConfig();
    // Use Stripe by default for Brasil Pix & Cartão (cheaper, protects MEI privacy with STRIPE BRASIL)
    const useStripe = process.env.PAYMENT_GATEWAY !== 'asaas';

    let paymentId = null;
    let paymentStatus = 'pending';
    let pixData = null;

    if (useStripe) {
      if (billingType === 'PIX') {
        const stripeRes = await createStripePixPayment({
          value,
          description,
          recordId,
          type,
          planType,
          customerName,
          cpfCnpj: customerData.cpfCnpj,
        });
        paymentId = stripeRes.paymentId;
        paymentStatus = 'pending';
        pixData = stripeRes.pix;
      } else {
        const stripeRes = await createStripeCardPayment({
          value,
          description,
          recordId,
          type,
          planType,
          customerName,
          cpfCnpj: customerData.cpfCnpj,
          creditCard: body.creditCard || {},
          postalCode: body.creditCardHolderInfo?.postalCode || '01001-000',
        });
        paymentId = stripeRes.paymentId;
        paymentStatus = stripeRes.status === 'succeeded' ? 'approved' : 'pending';
      }
    } else {
      // Asaas fallback
      const customerId = await findOrCreateCustomer({
        name: customerName,
        cpfCnpj: customerData.cpfCnpj,
        email: customerData.email,
        phone: customerData.phone,
      });

      const externalReference = `${type}:${recordId}`;
      const remoteIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

      if (billingType === 'PIX') {
        const asaasRes = await createAsaasPix({
          customerId,
          value,
          description,
          externalReference,
        });
        paymentId = asaasRes.payment?.id;
        paymentStatus = 'pending';
        pixData = {
          payload: asaasRes.pix?.payload,
          imageUrl: `data:image/png;base64,${asaasRes.pix?.encodedImage}`,
        };
      } else {
        const asaasRes = await createAsaasCard({
          customerId,
          value,
          description,
          externalReference,
          remoteIp,
          creditCard: body.creditCard || {},
          creditCardHolderInfo: body.creditCardHolderInfo || {
            name: customerName,
            cpfCnpj: customerData.cpfCnpj || '00000000000',
            postalCode: body.creditCardHolderInfo?.postalCode || '01001-000',
            addressNumber: body.creditCardHolderInfo?.addressNumber || '1',
          },
        });
        paymentId = asaasRes.payment?.id;
        if (asaasRes.payment?.status === 'CONFIRMED' || asaasRes.payment?.status === 'RECEIVED') {
          paymentStatus = 'approved';
        } else {
          paymentStatus = 'pending';
        }
      }
    }

    const recordPayload = {
      id: recordId,
      plan_type: planType,
      file_count: fileCount,
      unit_price: verifiedPrice.unitPrice,
      discount_amount: verifiedPrice.discountAmount,
      total_price: verifiedPrice.finalTotal,
      payment_status: paymentStatus,
      payment_id: paymentId,
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

    res.statusCode = 201;
    res.end(JSON.stringify({
      ok: true,
      gateway: useStripe ? 'stripe' : 'asaas',
      type,
      billingType,
      paymentId,
      paymentStatus,
      pix: pixData || null,
      purchase: createdRecord,
    }));
  } catch (err) {
    console.error('[API Payment Create Error]', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}
