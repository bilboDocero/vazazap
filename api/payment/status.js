import {
  updateStatusPurchasePayment,
  updateVitrinePurchasePayment,
} from '../../server/db.js';

import {
  getStripePaymentStatus,
} from '../../server/stripe.js';

import {
  getPaymentStatus as getAsaasPaymentStatus,
} from '../../server/asaas.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const paymentId = url.searchParams.get('paymentId');
    const recordId = url.searchParams.get('recordId');
    const type = url.searchParams.get('type') || 'status';

    if (!paymentId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'paymentId is required' }));
    }

    let statusInfo = null;
    if (paymentId.startsWith('pi_') || paymentId.startsWith('cs_')) {
      statusInfo = await getStripePaymentStatus(paymentId);
    } else {
      statusInfo = await getAsaasPaymentStatus(paymentId);
    }

    if (statusInfo.isPaid && recordId) {
      if (type === 'vitrine') {
        await updateVitrinePurchasePayment(recordId, { payment_status: 'approved' });
      } else {
        await updateStatusPurchasePayment(recordId, { payment_status: 'approved' });
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      paymentId,
      isPaid: statusInfo.isPaid,
      status: statusInfo.status,
      billingType: statusInfo.billingType,
      simulated: statusInfo.simulated || false,
    }));
  } catch (err) {
    console.error('[API Payment Status Error]', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}
