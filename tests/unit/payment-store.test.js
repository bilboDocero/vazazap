// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getPurchase, insertPendingPurchase, patchPurchase, getStatusPurchases } from '../../server/db.js';

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://audit.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = rows => ({ ok: true, json: async () => rows });
it('persists payment fields and never silently removes missing schema columns', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 400 });
  await expect(insertPendingPurchase('status', { id: 'test' })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  const payload = JSON.parse(fetch.mock.calls[0][1].body);
  expect(payload).toMatchObject({ payment_id: null, payment_intent_id: null, payment_status: 'pending', revision: 0, published_at: null });
  expect(fetch.mock.calls[0][1].headers.Prefer).toContain('ignore-duplicates');
});
it('throws on read failure instead of treating it as a missing purchase', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(getPurchase('status', 'test')).rejects.toThrow();
});
it('requires the previous revision to match for writes', async () => {
  fetch.mockResolvedValueOnce(response([]));
  expect(await patchPurchase('status', { id: 'test', revision: 7 }, { payment_status: 'approved' })).toBeNull();
  const [url, options] = fetch.mock.calls[0];
  expect(new URL(url).searchParams.get('revision')).toBe('eq.7');
  expect(JSON.parse(options.body).revision).toBe(8);
});
it('returns only approved published records and strips private identifiers', async () => {
  fetch.mockResolvedValueOnce(response([{ id: 'test', plan_type: 'status_normal', payment_status: 'approved', purchase_token_hash: 'private', payment_id: 'cs_test_private' }]));
  const list = await getStatusPurchases();
  const query = new URL(fetch.mock.calls[0][0]).searchParams;
  expect(query.get('payment_status')).toBe('eq.approved');
  expect(query.get('published_at')).toBe('not.is.null');
  expect(list[0]).not.toHaveProperty('purchase_token_hash');
  expect(list[0]).not.toHaveProperty('payment_id');
});
