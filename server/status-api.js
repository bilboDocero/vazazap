import create from '../api/payment/create.js';
import status from '../api/payment/status.js';
import config from '../api/payment/config.js';
import stripe from '../api/webhook/stripe.js';
import asaas from '../api/webhook/asaas.js';
import statusPurchase from '../api/status/purchase.js';
import statusPurchases from '../api/status/purchases.js';
import vitrinePurchase from '../api/vitrine/purchase.js';
import vitrinePurchases from '../api/vitrine/purchases.js';

const routes = {
  '/api/payment/create': create, '/api/payment/status': status, '/api/payment/config': config,
  '/api/webhook/stripe': stripe, '/api/webhook/asaas': asaas,
  '/api/status/purchase': statusPurchase, '/api/status/purchases': statusPurchases,
  '/api/vitrine/purchase': vitrinePurchase, '/api/vitrine/purchases': vitrinePurchases,
};
export function statusApiMiddleware(req, res, next) {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  const handler = routes[path] || (/^\/api\/(status|vitrine)\/purchase\//.test(path) ? statusPurchase : null);
  if (handler) return handler(req, res);
  next();
}
