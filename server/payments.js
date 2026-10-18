import { createHash, timingSafeEqual } from 'node:crypto';
import { getPurchase, insertPendingPurchase, patchPurchase, publicPurchase, calculateServerPrice } from './db.js';
import { getStripe, getStripeConfig, createStripeCheckoutSession, retrieveCheckout } from './stripe.js';
import { HttpError } from './http.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const blockedStates = new Set(['refunded', 'disputed']);
export function purchaseType(value) {
  if (!['status', 'vitrine'].includes(value)) throw new HttpError(400, 'Tipo de compra inválido.');
  return value;
}
function tokenHash(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new HttpError(401, 'Identificação da compra ausente.');
  return hash(token);
}
function authorize(row, token) {
  const actual = Buffer.from(tokenHash(token));
  const expected = Buffer.from(row.purchase_token_hash || '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new HttpError(403, 'Compra não autorizada.');
}
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function mediaUrl(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Imagem inválida.');
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  try { if (new URL(value).protocol === 'https:') return value; } catch { /* rejected below */ }
  throw new HttpError(400, 'Envie uma imagem válida.');
}
function normalizePurchase(body, type) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Compra inválida.');
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(body.id || '')) throw new HttpError(400, 'Identificador de compra inválido.');
  if (![type + '_normal', type + '_impulsionado'].includes(body.plan_type)) throw new HttpError(400, 'Plano inválido.');
  const count = body.file_count;
  if (!Number.isInteger(count) || count < 1 || count > 4 || !Array.isArray(body.media_files) || body.media_files.length !== count) throw new HttpError(400, 'Envie de uma a quatro imagens, conforme a quantidade escolhida.');
  if (!['PIX', 'WALLET', 'CREDIT_CARD'].includes(body.billingType)) throw new HttpError(400, 'Forma de pagamento inválida.');
  if (body.creditCard || body.paymentMethodId) throw new HttpError(400, 'Informe os dados de pagamento somente no Checkout seguro.');
  const pricing = calculateServerPrice({ planType: body.plan_type, fileCount: count });
  const network = body.social_network;
  const hosts = { instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/@', facebook: 'https://facebook.com/', telegram: 'https://t.me/' };
  const handle = text(body.user_handle, 60).replace(/^@/, '');
  if (!hosts[network] || !/^[\p{L}\p{N}_.-]+$/u.test(handle)) throw new HttpError(400, 'Perfil da rede social inválido.');
  const row = {
    id: body.id, plan_type: body.plan_type, file_count: count,
    unit_price: pricing.unitPrice, discount_amount: pricing.discountAmount, total_price: pricing.finalTotal,
    currency: 'brl', billing_type: body.billingType,
    profile_name: text(body.profile_name, 100) || 'Anunciante', user_handle: '@' + handle,
    social_network: network, social_link: hosts[network] + encodeURIComponent(handle),
    caption: text(body.caption, 500), profile_pic: body.profile_pic ? mediaUrl(body.profile_pic) : '',
    media_files: body.media_files.map((file, i) => ({ id: String(i + 1), name: text(file.name, 100), type: 'image', url: mediaUrl(file.url), caption: text(file.caption, 500) })),
    purchase_token_hash: tokenHash(body.purchase_token),
  };
  // Leave headroom below the hosting platform's request payload limit.
  if (Buffer.byteLength(JSON.stringify(row)) > 3 * 1024 * 1024) throw new HttpError(413, 'As imagens são muito grandes. Reduza o tamanho antes de pagar.');
  row.purchase_fingerprint = hash(JSON.stringify(row));
  row.created_at = new Date().toISOString();
  return row;
}

export async function createPayment(body) {
  const type = purchaseType(body.type);
  if (process.env.PAYMENT_GATEWAY && process.env.PAYMENT_GATEWAY !== 'stripe') throw new HttpError(503, 'Gateway de pagamento indisponível.');
  if (!getStripeConfig().webhookSecret) throw new HttpError(503, 'Confirmação de pagamentos ainda não configurada.');
  getStripe(); // Fail before saving a purchase if credentials are missing.
  const requested = normalizePurchase(body, type);
  const row = await insertPendingPurchase(type, requested);
  authorize(row, body.purchase_token);
  if (row.purchase_fingerprint !== requested.purchase_fingerprint) throw new HttpError(409, 'Esta compra já foi iniciada com outro conteúdo. Retome o pagamento original.');
  let session;
  if (row.payment_id) session = await retrieveCheckout(row.payment_id);
  else {
    // Never create a second charge after Stripe's idempotency retention expires.
    // The stable expiration is also part of Stripe's identical request parameters.
    if (Date.now() - new Date(row.created_at).getTime() > 25 * 60 * 1000) throw new HttpError(409, 'Tentativa antiga sem confirmação. Verifique o pagamento antes de iniciar outra compra.');
    session = await createStripeCheckoutSession(row, type);
  }
  const confirmed = await reconcileCheckout(session.id, { type, recordId: row.id });
  if (confirmed.payment_status !== 'approved' && session.status !== 'open') throw new HttpError(409, 'O pagamento está em processamento ou esta sessão foi encerrada. Consulte a compra antes de tentar novamente.');
  return { gateway: 'stripe', type, billingType: row.billing_type, paymentId: session.id, paymentStatus: confirmed.payment_status, checkoutUrl: session.status === 'open' ? session.url : null, purchase: publicPurchase(confirmed) };
}

function validateSession(row, session, type) {
  const metadata = session.metadata || {};
  if (session.mode !== 'payment' || metadata.recordId !== row.id || metadata.type !== type || metadata.purchaseFingerprint !== row.purchase_fingerprint || session.client_reference_id !== row.id || (row.payment_id && row.payment_id !== session.id)) throw new HttpError(409, 'Pagamento não corresponde à compra.');
  if (session.currency !== row.currency || session.amount_total !== Math.round(Number(row.total_price) * 100)) throw new HttpError(409, 'Valor do pagamento não corresponde à compra.');
  const expectedLive = /^(sk|rk)_live_/.test(getStripeConfig().secretKey);
  if (session.livemode !== expectedLive) throw new HttpError(409, 'Ambiente de pagamento incorreto.');
}

export async function reconcileCheckout(sessionId, expected = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    // Re-fetch current provider state on every CAS retry, not the event snapshot.
    const session = await retrieveCheckout(sessionId);
    const type = purchaseType(session.metadata?.type);
    const recordId = session.metadata?.recordId;
    if ((expected.type && expected.type !== type) || (expected.recordId && expected.recordId !== recordId)) throw new HttpError(409, 'Pagamento não corresponde à compra.');
    const row = await getPurchase(type, recordId);
    if (!row) throw new Error('Purchase not persisted yet'); // 503 => Stripe retries.
    validateSession(row, session, type);
    const intent = session.payment_intent;
    const charge = intent && typeof intent === 'object' ? intent.latest_charge : null;
    let state = 'pending';
    if (session.status === 'expired') state = 'expired';
    if (intent?.status === 'canceled') state = 'failed';
    if (session.payment_status === 'paid') {
      if (!intent || typeof intent !== 'object' || intent.status !== 'succeeded' || intent.currency !== row.currency || intent.amount_received !== session.amount_total || intent.metadata?.recordId !== row.id || intent.metadata?.type !== type || intent.metadata?.purchaseFingerprint !== row.purchase_fingerprint) throw new HttpError(409, 'Confirmação do pagamento incompleta.');
      if (!charge || typeof charge !== 'object') throw new Error('Charge details not available');
      state = 'approved';
    }
    if (charge?.refunded || charge?.amount_refunded > 0) state = 'refunded';
    if (charge?.disputed || expected.disputed) state = 'disputed';
    // Refund/dispute suspension cannot be reversed by a delayed success event.
    if (blockedStates.has(row.payment_status)) state = row.payment_status;
    if (row.payment_status === 'approved' && ['pending', 'expired', 'failed'].includes(state)) state = 'approved';
    const intentId = typeof intent === 'string' ? intent : intent?.id || null;
    if (row.payment_intent_id && intentId && row.payment_intent_id !== intentId) throw new HttpError(409, 'Cobrança não corresponde à compra.');
    if (row.payment_id === session.id && row.payment_status === state && row.payment_intent_id === intentId) return row;
    const updated = await patchPurchase(type, row, {
      payment_id: session.id, payment_intent_id: intentId,
      payment_status: state,
      published_at: state === 'approved' ? row.published_at || new Date().toISOString() : row.published_at,
    });
    if (updated) return updated;
  }
  throw new Error('Concurrent payment update; retry');
}

export async function checkPayment({ type, recordId, paymentId, token }) {
  purchaseType(type);
  const row = await getPurchase(type, recordId);
  if (!row) throw new HttpError(404, 'Compra não encontrada.');
  authorize(row, token);
  if (paymentId && row.payment_id && row.payment_id !== paymentId) throw new HttpError(409, 'Pagamento não corresponde à compra.');
  const sessionId = row.payment_id || paymentId;
  if (!sessionId) return { isPaid: false, status: 'pending', purchase: null };
  const updated = await reconcileCheckout(sessionId, { type, recordId });
  return { isPaid: updated.payment_status === 'approved', status: updated.payment_status, paymentId: updated.payment_id, purchase: updated.payment_status === 'approved' ? publicPurchase(updated) : null };
}

export async function handleStripeEvent(event) {
  const object = event.data?.object;
  if (!object) return;
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) {
    if (!object.metadata?.purchaseFingerprint) return; // Unrelated/legacy Checkout.
    await reconcileCheckout(object.id);
    return;
  }
  let intentId;
  if (['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.canceled'].includes(event.type)) intentId = object.id;
  if (['charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'].includes(event.type)) intentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
  if (!intentId) return;
  const intent = await getStripe().paymentIntents.retrieve(intentId);
  if (!intent.metadata?.purchaseFingerprint) return;
  const sessions = await getStripe().checkout.sessions.list({ payment_intent: intentId, limit: 2 });
  if (sessions.data.length !== 1) throw new Error('Checkout not found for payment');
  await reconcileCheckout(sessions.data[0].id, { type: intent.metadata.type, recordId: intent.metadata.recordId, disputed: event.type === 'charge.dispute.created' });
}
