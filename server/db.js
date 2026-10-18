import './env.js';
import pg from 'pg';

let pgPool;
export async function closeDatabase() {
  if (pgPool) await pgPool.end();
  pgPool = undefined;
}
function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ''), key };
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString && !process.env.PGHOST) throw new Error('Database not configured');
  if (!pgPool) pgPool = new pg.Pool({ ...(connectionString ? { connectionString } : {}), connectionTimeoutMillis: 5000 });
  return { pool: pgPool };
}
function tableFor(type) {
  if (!['status', 'vitrine'].includes(type)) throw new Error('Invalid purchase type');
  return type + '_purchases';
}
async function rest(db, table, query, method = 'GET', body, prefer = 'return=representation') {
  const response = await fetch(db.url + '/rest/v1/' + table + '?' + new URLSearchParams(query), {
    method, headers: { apikey: db.key, Authorization: 'Bearer ' + db.key, 'Content-Type': 'application/json', Prefer: prefer },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Database operation failed: ' + response.status);
  return response.json();
}
export function publicPurchase(row) {
  if (!row) return null;
  const fields = ['id', 'plan_type', 'file_count', 'unit_price', 'discount_amount', 'total_price', 'payment_status', 'profile_name', 'user_handle', 'social_network', 'social_link', 'caption', 'profile_pic', 'media_files', 'published_at', 'created_at'];
  return Object.fromEntries(fields.map(key => [key, row[key]]));
}
export async function getPurchase(type, id) {
  const db = database(), table = tableFor(type);
  const rows = db.pool ? (await db.pool.query('SELECT * FROM ' + table + ' WHERE id = $1', [id])).rows
    : await rest(db, table, { id: 'eq.' + id, select: '*' });
  return rows[0] || null;
}
export async function insertPendingPurchase(type, data) {
  const db = database(), table = tableFor(type);
  const record = { ...data, payment_status: 'pending', payment_id: null, payment_intent_id: null, revision: 0, published_at: null };
  if (db.pool) {
    const keys = Object.keys(record);
    const values = keys.map(key => key === 'media_files' ? JSON.stringify(record[key]) : record[key]);
    await db.pool.query('INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + keys.map((_, i) => '$' + (i + 1)).join(',') + ') ON CONFLICT (id) DO NOTHING', values);
  } else {
    await rest(db, table, { on_conflict: 'id' }, 'POST', record, 'resolution=ignore-duplicates,return=representation');
  }
  const stored = await getPurchase(type, record.id);
  if (!stored) throw new Error('Purchase was not persisted');
  return stored;
}
export async function patchPurchase(type, row, changes) {
  const allowed = ['payment_id', 'payment_intent_id', 'payment_status', 'published_at', 'billing_type'];
  if (Object.keys(changes).some(key => !allowed.includes(key))) throw new Error('Invalid purchase update');
  const db = database(), table = tableFor(type);
  const data = { ...changes, revision: row.revision + 1 };
  let rows;
  if (db.pool) {
    const keys = Object.keys(data), values = Object.values(data);
    values.push(row.id, row.revision);
    rows = (await db.pool.query('UPDATE ' + table + ' SET ' + keys.map((key, i) => key + ' = $' + (i + 1)).join(',') + ' WHERE id = $' + (keys.length + 1) + ' AND revision = $' + (keys.length + 2) + ' RETURNING *', values)).rows;
  } else rows = await rest(db, table, { id: 'eq.' + row.id, revision: 'eq.' + row.revision }, 'PATCH', data);
  return rows[0] || null;
}
async function published(type) {
  const db = database(), table = tableFor(type);
  const rows = db.pool ? (await db.pool.query("SELECT * FROM " + table + " WHERE payment_status = 'approved' AND published_at IS NOT NULL ORDER BY published_at DESC")).rows
    : await rest(db, table, { payment_status: 'eq.approved', published_at: 'not.is.null', order: 'published_at.desc' });
  return rows.map(publicPurchase).sort((a, b) => Number(b.plan_type.endsWith('_impulsionado')) - Number(a.plan_type.endsWith('_impulsionado')) || new Date(b.published_at) - new Date(a.published_at));
}
export const getStatusPurchases = () => published('status');
export const getVitrinePurchases = () => published('vitrine');
export const getStatusPurchaseById = id => getPurchase('status', id);
export const getVitrinePurchaseById = id => getPurchase('vitrine', id);

export function calculateServerPrice({ planType = 'status_normal', fileCount = 1 }) {
  const count = Math.min(Math.max(Number(fileCount) || 1, 1), 4);
  const isImpulsionado = planType.includes('impulsionado');

  const unitPrice = isImpulsionado ? 149.00 : 4.90;
  const grossTotal = Math.round(unitPrice * count * 100) / 100;

  let discountPercent = 0;
  let discountAmount = 0;

  if (isImpulsionado) {
    if (count === 2) { discountPercent = 7; discountAmount = 21.00; }
    else if (count === 3) { discountPercent = 12; discountAmount = 54.00; }
    else if (count === 4) { discountPercent = 18; discountAmount = 108.00; }
  } else {
    if (count === 2) { discountPercent = 5; discountAmount = 0.50; }
    else if (count === 3) { discountPercent = 10; discountAmount = 1.50; }
    else if (count === 4) { discountPercent = 15; discountAmount = 3.00; }
  }

  const finalTotal = Math.round(Math.max(0, grossTotal - discountAmount) * 100) / 100;

  return {
    fileCount: count,
    unitPrice,
    grossTotal,
    discountAmount,
    discountPercent,
    finalTotal,
  };
}
