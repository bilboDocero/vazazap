import {
  updateStatusPurchasePayment,
  updateVitrinePurchasePayment,
} from '../../server/db.js';

import {
  getStripe,
  getStripeConfig,
} from '../../server/stripe.js';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => { resolve(Buffer.concat(chunks)); });
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
    const stripe = getStripe();
    const config = getStripeConfig();
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];

    let event = null;
    if (stripe && config.webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString('utf-8'));
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data?.object;
      const recordId = paymentIntent?.metadata?.recordId;
      const type = paymentIntent?.metadata?.type || 'status';

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
    console.error('[Stripe Webhook Error]', err.message);
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}
