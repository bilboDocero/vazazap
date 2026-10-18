// Integration test against a dedicated, disposable local PostgreSQL database.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
const connectionString = process.env.PAYMENT_TEST_DATABASE_URL || process.argv[2];
const url = new URL(connectionString || 'http://invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/vorcarozap_payments_test') throw new Error('Use a dedicated local vorcarozap_payments_test database');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.DATABASE_URL = connectionString;
const client = new pg.Client({ connectionString });
await client.connect();
let db;
try {
  const baseline = (await readFile('scripts/supabase-schema.sql', 'utf8')).split('-- Run once before')[0]
    .replace(/^.*(?:payment_id|billing_type).*\r?\n/gm, '');
  await client.query(baseline);
  await client.query("CREATE ROLE anon; CREATE ROLE authenticated; GRANT SELECT, INSERT, UPDATE ON status_purchases, vitrine_purchases TO anon, authenticated;");
  const migration = await readFile('scripts/migrations/20261018-stripe-purchases.sql', 'utf8');
  await client.query(migration);
  await client.query(migration); // Repeat migration must be safe.
  db = await import('../server/db.js');
  for (const type of ['status', 'vitrine']) {
    const draft = { id: 'db-test-' + type, plan_type: type + '_normal', file_count: 1, unit_price: 4.9, discount_amount: 0, total_price: 4.9, currency: 'brl', billing_type: 'PIX', profile_name: 'Test', user_handle: '@test', social_network: 'instagram', social_link: 'https://instagram.com/test', caption: '', profile_pic: '', media_files: [{ url: 'https://example.com/photo.jpg' }], purchase_token_hash: 'a'.repeat(64), purchase_fingerprint: 'b'.repeat(64), created_at: new Date().toISOString() };
    const first = await db.insertPendingPurchase(type, draft);
    const again = await db.insertPendingPurchase(type, { ...draft, total_price: 0.01 });
    assert.equal(Number(again.total_price), 4.9);
    assert.equal(first.payment_status, 'pending');
    const approved = await db.patchPurchase(type, first, { payment_id: 'cs_test_' + type, payment_intent_id: 'pi_test_' + type, payment_status: 'approved', published_at: new Date().toISOString() });
    assert.equal(approved.payment_id, 'cs_test_' + type);
    assert.equal(await db.patchPurchase(type, first, { payment_status: 'pending' }), null);
    const list = await (type === 'status' ? db.getStatusPurchases() : db.getVitrinePurchases());
    assert.equal(list.length, 1); assert.equal(list[0].purchase_token_hash, undefined);
    await db.patchPurchase(type, approved, { payment_status: 'refunded' });
    assert.equal((await (type === 'status' ? db.getStatusPurchases() : db.getVitrinePurchases())).length, 0);
    const privilege = await client.query('SELECT has_table_privilege($1, $2, $3) AS allowed', ['anon', type + '_purchases', 'INSERT']);
    assert.equal(privilege.rows[0].allowed, false);
  }
  console.log('PASS: migration twice, both purchase types, immutable drafts, payment identifiers, CAS, approved-only lists, private fields, anonymous writes blocked');
} finally {
  await client.end();
  await db?.closeDatabase();
}
