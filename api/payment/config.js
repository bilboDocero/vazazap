import { getStripeConfig } from '../../server/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  const stripeConfig = getStripeConfig();
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    publishableKey: stripeConfig.publishableKey || '',
    isConfigured: stripeConfig.isConfigured,
  }));
}
