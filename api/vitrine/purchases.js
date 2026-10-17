import { getVitrinePurchases } from '../../server/db.js';

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
    const rows = await getVitrinePurchases();
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, purchases: rows }));
  } catch (err) {
    console.error('[Supabase Vitrine Purchases GET Error]', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message, purchases: [] }));
  }
}
