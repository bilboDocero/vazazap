import {
  updateStatusPurchasePayment,
  updateVitrinePurchasePayment,
} from '../../server/db.js';

import {
  getAsaasConfig,
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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const config = getAsaasConfig();
    const tokenHeader = req.headers['asaas-access-token'];

    if (config.webhookSecret && tokenHeader !== config.webhookSecret) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'Invalid webhook token' }));
    }

    const eventData = await readBody(req);
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

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, received: true }));
  } catch (err) {
    console.error('[API Webhook Error]', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}
