// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';

vi.mock('../../server/db.js', async importOriginal => {
  const original = await importOriginal();
  return { ...original, getPurchase: vi.fn(), insertPendingPurchase: vi.fn(), patchPurchase: vi.fn() };
});
import { getPurchase, insertPendingPurchase, patchPurchase, publicPurchase } from '../../server/db.js';
import { getStripe } from '../../server/stripe.js';
import { createPayment, checkPayment, handleStripeEvent } from '../../server/payments.js';
import webhook from '../../api/webhook/stripe.js';
import legacy from '../../api/status/purchase.js';
import legacyAsaas from '../../api/webhook/asaas.js';
import createHandler from '../../api/payment/create.js';
import { statusApiMiddleware } from '../../server/status-api.js';

const token = 'a'.repeat(32);
const draft = (type = 'status') => ({
  id: 'purchase-1234567890123456', type, purchase_token: token,
  plan_type: `${type}_normal`, file_count: 1, billingType: 'PIX',
  profile_name: 'Anunciante', user_handle: '@teste', social_network: 'instagram',
  caption: 'Legenda', profile_pic: '', media_files: [{ name: 'foto.png', url: 'https://example.com/photo.png', caption: 'Mídia completa' }],
});
let rows, sessions, client, createSession, retrieveSession;
const copy = value => structuredClone(value);

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_payment_tests');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_payment_tests');
  vi.stubEnv('PAYMENT_GATEWAY', 'stripe');
  vi.stubEnv('PAYMENT_RETURN_ORIGIN', 'https://www.vorcarozap.com');
  rows = new Map(); sessions = new Map(); client = getStripe();
  getPurchase.mockImplementation(async (type, id) => copy(rows.get(`${type}:${id}`) || null));
  insertPendingPurchase.mockImplementation(async (type, data) => {
    const key = `${type}:${data.id}`;
    if (!rows.has(key)) rows.set(key, { ...copy(data), revision: 0, payment_status: 'pending', payment_id: null, payment_intent_id: null, published_at: null });
    return copy(rows.get(key));
  });
  patchPurchase.mockImplementation(async (type, row, changes) => {
    const key = `${type}:${row.id}`, current = rows.get(key);
    if (current.revision !== row.revision) return null;
    const updated = { ...current, ...copy(changes), revision: current.revision + 1 };
    rows.set(key, updated); return copy(updated);
  });
  createSession = vi.spyOn(client.checkout.sessions, 'create').mockImplementation(async params => {
    const id = `cs_test_${params.client_reference_id.replaceAll('-', '')}`;
    if (!sessions.has(id)) sessions.set(id, { id, mode: 'payment', status: 'open', payment_status: 'unpaid', currency: 'brl', livemode: false,
      amount_total: params.line_items[0].price_data.unit_amount, client_reference_id: params.client_reference_id,
      metadata: copy(params.metadata), payment_intent: null, url: `https://checkout.stripe.com/c/pay/${id}` });
    return copy(sessions.get(id));
  });
  retrieveSession = vi.spyOn(client.checkout.sessions, 'retrieve').mockImplementation(async id => {
    if (!sessions.has(id)) throw new Error('Stripe unavailable');
    return copy(sessions.get(id));
  });
  vi.spyOn(client.paymentIntents, 'retrieve').mockImplementation(async id => {
    const session = [...sessions.values()].find(s => s.payment_intent?.id === id);
    if (!session) throw new Error('Unknown intent');
    return copy(session.payment_intent);
  });
  vi.spyOn(client.checkout.sessions, 'list').mockImplementation(async ({ payment_intent }) => ({ data: [...sessions.values()].filter(s => s.payment_intent?.id === payment_intent).map(copy) }));
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

async function paid(type = 'status') {
  const result = await createPayment(draft(type));
  const session = sessions.get(result.paymentId);
  session.status = 'complete'; session.payment_status = 'paid';
  session.payment_intent = { id: 'pi_test_123', status: 'succeeded', amount_received: session.amount_total, currency: 'brl', metadata: copy(session.metadata), latest_charge: { id: 'ch_test_123', refunded: false, disputed: false, amount_refunded: 0 } };
  return { session, result, params: { type, recordId: draft(type).id, paymentId: session.id, token } };
}
async function invoke(handler, { body, headers = {}, method = 'POST', url = '/' } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  Object.assign(req, { method, headers, url });
  const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
  await handler(req, res);
  return { status: res.statusCode, body: JSON.parse(res.end.mock.calls[0][0]) };
}
async function deliver(event, handler = webhook) {
  const raw = JSON.stringify(event, null, 2);
  const signature = client.webhooks.generateTestHeaderString({ payload: raw, secret: 'whsec_payment_tests' });
  return invoke(handler, { body: raw, headers: { 'stripe-signature': signature }, url: '/api/webhook/stripe' });
}

describe('Payment creation and persistence', () => {
  it.each(['status', 'vitrine'])('saves full %s draft before Stripe, with verified price and stable metadata', async type => {
    const result = await createPayment({ ...draft(type), total_price: 0.01, payment_status: 'approved' });
    expect(result.paymentStatus).toBe('pending');
    expect(insertPendingPurchase.mock.invocationCallOrder[0]).toBeLessThan(createSession.mock.invocationCallOrder[0]);
    const [params, options] = createSession.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(490);
    expect(params.payment_method_types).toEqual(['pix']);
    expect(params.metadata).toEqual(params.payment_intent_data.metadata);
    expect(params.metadata.recordId).toBe(draft(type).id);
    expect(options.idempotencyKey).toContain(draft(type).id);
    expect(result.purchase.media_files[0].caption).toBe('Mídia completa');
    expect(result.purchase).not.toHaveProperty('purchase_token_hash');
    expect(params.success_url).toMatch(/^https:\/\/www.vorcarozap.com\//);
  });
  it('requires working database before any Stripe session is created', async () => {
    insertPendingPurchase.mockRejectedValueOnce(new Error('DB failed'));
    await expect(createPayment(draft())).rejects.toThrow('DB failed');
    expect(createSession).not.toHaveBeenCalled();
  });
  it('does not simulate success on Stripe failure; retries use identical parameters and key', async () => {
    createSession.mockRejectedValueOnce(new Error('Stripe failure'));
    await expect(createPayment(draft())).rejects.toThrow('Stripe failure');
    await createPayment(draft());
    expect(createSession.mock.calls[0]).toEqual(createSession.mock.calls[1]);
    expect([...rows.values()][0].payment_status).toBe('pending');
  });
  it('reuses the existing Checkout on repeated requests', async () => {
    const a = await createPayment(draft()), b = await createPayment(draft());
    expect(a.paymentId).toBe(b.paymentId); expect(createSession).toHaveBeenCalledTimes(1);
  });
  it('handles concurrent creation with the same Stripe idempotency key', async () => {
    const [a, b] = await Promise.all([createPayment(draft()), createPayment(draft())]);
    expect(a.paymentId).toBe(b.paymentId); expect(sessions.size).toBe(1);
    for (const call of createSession.mock.calls) expect(call[1]).toEqual(createSession.mock.calls[0][1]);
  });
  it('does not allow changing a pending purchase or accessing it with another token', async () => {
    await createPayment(draft());
    await expect(createPayment({ ...draft(), plan_type: 'status_impulsionado' })).rejects.toMatchObject({ status: 409 });
    await expect(createPayment({ ...draft(), purchase_token: 'b'.repeat(32) })).rejects.toMatchObject({ status: 403 });
    expect(createSession).toHaveBeenCalledTimes(1);
  });
  it.each([{ file_count: 1.5 }, { file_count: 4 }, { plan_type: 'vitrine_normal' }, { creditCard: {} }, { media_files: [{ url: 'javascript:alert(1)' }] }])('rejects invalid purchase before charging: %j', async changes => {
    await expect(createPayment({ ...draft(), ...changes })).rejects.toMatchObject({ status: 400 });
    expect(createSession).not.toHaveBeenCalled();
  });
  it('fails closed when webhook secret or Stripe key is missing', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    await expect(createPayment(draft())).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_payment_tests'); vi.stubEnv('STRIPE_SECRET_KEY', '');
    await expect(createPayment(draft())).rejects.toMatchObject({ status: 503 });
    expect(insertPendingPurchase).not.toHaveBeenCalled();
  });
  it('never recreates an old unbound session after idempotency retention', async () => {
    createSession.mockRejectedValueOnce(new Error('Unknown result'));
    await expect(createPayment(draft())).rejects.toThrow();
    [...rows.values()][0].created_at = new Date(Date.now() - 2 * 86400000).toISOString();
    await expect(createPayment(draft())).rejects.toMatchObject({ status: 409 });
    expect(createSession).toHaveBeenCalledTimes(1);
  });
});

describe('Server-confirmed publication', () => {
  it.each(['status', 'vitrine'])('publishes %s once, keeps media and timestamp on repeated reconciliation', async type => {
    const { params } = await paid(type);
    const first = await checkPayment(params), second = await checkPayment(params);
    expect(first.isPaid).toBe(true); expect(second.purchase.published_at).toBe(first.purchase.published_at);
    expect(second.purchase.media_files).toHaveLength(1);
    expect([...rows.values()][0].revision).toBe(2); // bind + approve, no duplicate mutation.
  });
  it('requires the purchase token and rejects another payment or product', async () => {
    const { params } = await paid();
    await expect(checkPayment({ ...params, token: '' })).rejects.toMatchObject({ status: 401 });
    await expect(checkPayment({ ...params, token: 'b'.repeat(32) })).rejects.toMatchObject({ status: 403 });
    await expect(checkPayment({ ...params, paymentId: 'cs_test_other' })).rejects.toMatchObject({ status: 409 });
    await expect(checkPayment({ ...params, type: 'vitrine' })).rejects.toMatchObject({ status: 404 });
    expect([...rows.values()][0].payment_status).toBe('pending');
  });
  it.each([{ amount_total: 1 }, { currency: 'usd' }, { livemode: true }, { client_reference_id: 'other' }])('rejects mismatched Stripe data: %j', async changes => {
    const { session, params } = await paid(); Object.assign(session, changes);
    await expect(checkPayment(params)).rejects.toMatchObject({ status: 409 });
    expect([...rows.values()][0].payment_status).toBe('pending');
  });
  it('does not approve a processing or requires_action PaymentIntent', async () => {
    const { session, params } = await paid(); session.payment_intent.status = 'requires_action';
    await expect(checkPayment(params)).rejects.toMatchObject({ status: 409 });
  });
  it('does not turn a retrieval failure into approval', async () => {
    const { params } = await paid(); retrieveSession.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(checkPayment(params)).rejects.toThrow('Provider unavailable');
    expect([...rows.values()][0].payment_status).toBe('pending');
  });
  it('does not accept invented simulation IDs', async () => {
    await createPayment(draft()); [...rows.values()][0].payment_id = null;
    await expect(checkPayment({ type: 'status', recordId: draft().id, token, paymentId: 'cs_simulated_123' })).rejects.toMatchObject({ status: 400 });
  });
  it('legacy publication cannot create purchases or modify purchased content', async () => {
    expect((await invoke(legacy, { body: { id: 'unpaid' } })).status).toBe(404);
    const { params } = await paid();
    const result = await invoke(legacy, { body: { id: params.recordId, purchase_token: token, payment_id: params.paymentId, plan_type: 'status_impulsionado', payment_status: 'approved', media_files: [] } });
    expect(result.body.purchase.plan_type).toBe('status_normal');
    expect(result.body.purchase.media_files).toHaveLength(1);
    expect((await invoke(legacy, { method: 'DELETE' })).status).toBe(405);
    expect((await invoke(legacyAsaas)).status).toBe(410);
  });
  it('redacts private ownership and Stripe fields from public records', () => {
    expect(publicPurchase({ id: 'x', purchase_token_hash: 'secret', purchase_fingerprint: 'secret', payment_id: 'cs_test_x', payment_intent_id: 'pi_x' })).not.toHaveProperty('payment_id');
    expect(JSON.stringify(publicPurchase({ purchase_token_hash: 'secret', purchase_fingerprint: 'secret' }))).not.toContain('secret');
  });
});

describe('Authenticated webhook and retries', () => {
  it('rejects missing or invalid signatures and missing configuration', async () => {
    const body = { type: 'payment_intent.succeeded', data: { object: {} } };
    expect((await invoke(webhook, { body })).status).toBe(400);
    expect((await invoke(webhook, { body, headers: { 'stripe-signature': 'invalid' } })).status).toBe(400);
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect((await invoke(webhook, { body })).status).toBe(503);
    expect(patchPurchase).not.toHaveBeenCalled();
  });
  it('verifies exact raw bytes and publishes without a browser return', async () => {
    const { session } = await paid();
    const event = { type: 'checkout.session.completed', data: { object: session } };
    expect((await deliver(event)).status).toBe(200);
    expect([...rows.values()][0].payment_status).toBe('approved');
    const before = patchPurchase.mock.calls.length;
    expect((await deliver(event)).status).toBe(200);
    expect(patchPurchase.mock.calls.length).toBe(before);
  });
  it('uses the same signature enforcement in development', async () => {
    const result = await invoke((req, res) => statusApiMiddleware(req, res, () => {}), { url: '/api/webhook/stripe', body: {} });
    expect(result.status).toBe(400);
  });
  it('returns 503 for DB failure so Stripe can retry', async () => {
    const { session } = await paid(); patchPurchase.mockRejectedValueOnce(new Error('DB outage'));
    expect((await deliver({ type: 'checkout.session.completed', data: { object: session } })).status).toBe(503);
    expect((await deliver({ type: 'checkout.session.completed', data: { object: session } })).status).toBe(200);
  });
  it('processes payment_intent success before the create response is bound', async () => {
    const { session } = await paid(); [...rows.values()][0].payment_id = null;
    expect((await deliver({ type: 'payment_intent.succeeded', data: { object: session.payment_intent } })).status).toBe(200);
    expect([...rows.values()][0].payment_id).toBe(session.id);
    expect([...rows.values()][0].payment_status).toBe('approved');
  });
  it('does not acknowledge a managed event before its purchase exists', async () => {
    const { session } = await paid(); rows.clear();
    expect((await deliver({ type: 'checkout.session.completed', data: { object: session } })).status).toBe(503);
  });
  it('records partial refunds and never restores publication on a delayed success', async () => {
    const { session, params } = await paid(); await checkPayment(params);
    session.payment_intent.latest_charge.amount_refunded = 100;
    await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: session.payment_intent.id } } });
    expect([...rows.values()][0].payment_status).toBe('refunded');
    session.payment_intent.latest_charge.amount_refunded = 0;
    await handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: session.payment_intent } });
    expect((await checkPayment(params)).isPaid).toBe(false);
  });
  it('suspends disputed payments', async () => {
    const { session } = await paid();
    await handleStripeEvent({ type: 'charge.dispute.created', data: { object: { payment_intent: session.payment_intent.id } } });
    expect([...rows.values()][0].payment_status).toBe('disputed');
  });
  it('handles delayed success and expiry using current Stripe state', async () => {
    const result = await createPayment(draft()); const session = sessions.get(result.paymentId);
    session.status = 'expired';
    await handleStripeEvent({ type: 'checkout.session.expired', data: { object: session } });
    expect([...rows.values()][0].payment_status).toBe('expired');
  });
  it('does not leak provider error details through the API', async () => {
    createSession.mockRejectedValueOnce(new Error('sk_live_sensitive customer@example.com'));
    const result = await invoke(createHandler, { body: draft() });
    expect(result.status).toBe(503); expect(JSON.stringify(result)).not.toContain('sensitive');
  });
});
