import './env.js';
import Stripe from 'stripe';
import { HttpError } from './http.js';

let client, clientKey;
export function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  return { secretKey, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '', webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', isConfigured: /^(sk|rk)_(live|test)_/.test(secretKey) };
}
export function getStripe() {
  const config = getStripeConfig();
  if (!config.isConfigured) throw new HttpError(503, 'Pagamentos indisponíveis.');
  if (!client || clientKey !== config.secretKey) {
    clientKey = config.secretKey;
    client = new Stripe(clientKey, { apiVersion: '2026-09-30.endive', maxNetworkRetries: 2, timeout: 20000 });
  }
  return client;
}
export function paymentOrigin() {
  const url = new URL(process.env.PAYMENT_RETURN_ORIGIN || 'https://www.vorcarozap.com');
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid payment return origin');
  return url.origin;
}
export async function createStripeCheckoutSession(row, type) {
  const metadata = { recordId: row.id, type, planType: row.plan_type, purchaseFingerprint: row.purchase_fingerprint };
  const route = paymentOrigin() + '/#/' + type;
  return getStripe().checkout.sessions.create({
    ui_mode: 'hosted_page', mode: 'payment', client_reference_id: row.id,
    metadata, payment_intent_data: { metadata },
    payment_method_types: row.billing_type === 'PIX' ? ['pix'] : ['card'],
    success_url: route + '?payment=success&session_id={CHECKOUT_SESSION_ID}&record_id=' + encodeURIComponent(row.id) + '&type=' + type,
    cancel_url: route + '?payment=cancel&record_id=' + encodeURIComponent(row.id) + '&type=' + type,
    expires_at: Math.floor(new Date(row.created_at).getTime() / 1000) + 3600,
    line_items: [{ price_data: { currency: 'brl', unit_amount: Math.round(Number(row.total_price) * 100), product_data: { name: 'VorcaroZap - ' + row.plan_type + ' (' + row.file_count + ' mídia(s))' } }, quantity: 1 }],
  }, { idempotencyKey: 'purchase:' + type + ':' + row.id + ':' + row.purchase_fingerprint });
}
export async function retrieveCheckout(id) {
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id || '')) throw new HttpError(400, 'Identificador de pagamento inválido.');
  return getStripe().checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] });
}
