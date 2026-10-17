import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
const { Pool } = pg;

// Synchronously load .env if present in current working directory
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore environment load issues
  }
}
loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isSupabaseRest = Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http'));

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
const isSupabasePg = (connectionString && connectionString.includes('supabase')) ||
  (process.env.PGHOST && process.env.PGHOST.includes('supabase')) ||
  process.env.PGSSL === 'true';

let pgPool = null;
if (!isSupabaseRest && (connectionString || process.env.PGHOST)) {
  const poolConfig = connectionString
    ? {
        connectionString,
        ssl: isSupabasePg ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'radar',
        password: process.env.PGPASSWORD || 'radar_local',
        database: process.env.PGDATABASE || 'vorcarozap',
        ssl: isSupabasePg ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      };

  pgPool = new Pool(poolConfig);
  pgPool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err.message);
  });
}

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'User-Agent': 'vorcarozap-Server/1.0',
  };
}

/**
 * Sorts items so impulsionados always stay at the top,
 * and normal items are positioned below, ordered by published_at DESC.
 */
function sortBoostedFirst(list, boostKey = 'status_impulsionado') {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aBoost = a.plan_type === boostKey ? 0 : 1;
    const bBoost = b.plan_type === boostKey ? 0 : 1;
    if (aBoost !== bBoost) return aBoost - bBoost;
    return new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0);
  });
}

// ── STATUS PURCHASES CRUD ─────────────────────────────────────────

export async function getStatusPurchases() {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_purchases?select=*&payment_status=neq.pending&order=published_at.desc`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase GET status_purchases failed (${res.status}): ${errText}`);
    }
    const rows = await res.json();
    return sortBoostedFirst(rows, 'status_impulsionado');
  }

  if (pgPool) {
    const result = await pgPool.query(`
      SELECT * FROM status_purchases
      WHERE payment_status != 'pending'
      ORDER BY
        CASE WHEN plan_type = 'status_impulsionado' THEN 0 ELSE 1 END ASC,
        published_at DESC
    `);
    return result.rows;
  }

  return [];
}

export async function createStatusPurchaseRecord(data) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_purchases`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase POST status_purchases failed (${res.status}): ${errText}`);
    }
    const created = await res.json();
    return Array.isArray(created) ? created[0] : created;
  }

  if (pgPool) {
    const query = `
      INSERT INTO status_purchases (
        id, plan_type, file_count, unit_price, discount_amount, total_price,
        payment_status, profile_name, user_handle, social_network, social_link,
        caption, profile_pic, media_files, published_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      data.id, data.plan_type, data.file_count, data.unit_price, data.discount_amount, data.total_price,
      data.payment_status, data.profile_name, data.user_handle, data.social_network, data.social_link,
      data.caption, data.profile_pic, JSON.stringify(data.media_files || [])
    ];
    const result = await pgPool.query(query, values);
    return result.rows[0];
  }

  return data;
}

export async function getStatusPurchaseById(id) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_purchases?id=eq.${encodeURIComponent(id)}`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }
  if (pgPool) {
    const res = await pgPool.query('SELECT * FROM status_purchases WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return null;
}

export async function updateStatusPurchasePayment(id, { payment_status = 'approved', media_files }) {
  const updateData = { payment_status };
  if (media_files) updateData.media_files = media_files;

  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_purchases?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify(updateData),
    });
    return res.ok;
  }
  if (pgPool) {
    const res = await pgPool.query(
      'UPDATE status_purchases SET payment_status = $1 WHERE id = $2 RETURNING id',
      [payment_status, id]
    );
    return res.rowCount > 0;
  }
  return false;
}

export async function deleteStatusPurchaseRecord(id) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_purchases?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: supabaseHeaders(),
    });
    return res.ok;
  }

  if (pgPool) {
    const result = await pgPool.query('DELETE FROM status_purchases WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  return false;
}

// ── VITRINE PURCHASES CRUD ────────────────────────────────────────

export async function getVitrinePurchases() {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_purchases?select=*&payment_status=neq.pending&order=published_at.desc`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase GET vitrine_purchases failed (${res.status}): ${errText}`);
    }
    const rows = await res.json();
    return sortBoostedFirst(rows, 'vitrine_impulsionado');
  }

  if (pgPool) {
    const result = await pgPool.query(`
      SELECT * FROM vitrine_purchases
      WHERE payment_status != 'pending'
      ORDER BY
        CASE WHEN plan_type = 'vitrine_impulsionado' THEN 0 ELSE 1 END ASC,
        published_at DESC
    `);
    return result.rows;
  }

  return [];
}

export async function getVitrinePurchaseById(id) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_purchases?id=eq.${encodeURIComponent(id)}`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }
  if (pgPool) {
    const res = await pgPool.query('SELECT * FROM vitrine_purchases WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return null;
}

export async function updateVitrinePurchasePayment(id, { payment_status = 'approved', media_files }) {
  const updateData = { payment_status };
  if (media_files) updateData.media_files = media_files;

  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_purchases?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify(updateData),
    });
    return res.ok;
  }
  if (pgPool) {
    const res = await pgPool.query(
      'UPDATE vitrine_purchases SET payment_status = $1 WHERE id = $2 RETURNING id',
      [payment_status, id]
    );
    return res.rowCount > 0;
  }
  return false;
}

export async function createVitrinePurchaseRecord(data) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_purchases`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase POST vitrine_purchases failed (${res.status}): ${errText}`);
    }
    const created = await res.json();
    return Array.isArray(created) ? created[0] : created;
  }

  if (pgPool) {
    const query = `
      INSERT INTO vitrine_purchases (
        id, plan_type, file_count, unit_price, discount_amount, total_price,
        payment_status, profile_name, user_handle, social_network, social_link,
        caption, profile_pic, media_files, published_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      data.id, data.plan_type, data.file_count, data.unit_price, data.discount_amount, data.total_price,
      data.payment_status, data.profile_name, data.user_handle, data.social_network, data.social_link,
      data.caption, data.profile_pic, JSON.stringify(data.media_files || [])
    ];
    const result = await pgPool.query(query, values);
    return result.rows[0];
  }

  return data;
}

export async function deleteVitrinePurchaseRecord(id) {
  if (isSupabaseRest) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_purchases?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: supabaseHeaders(),
    });
    return res.ok;
  }

  if (pgPool) {
    const result = await pgPool.query('DELETE FROM vitrine_purchases WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  return false;
}

/**
 * Compatibility pool proxy
 */
export const pool = {
  query: async (sql, values) => {
    if (pgPool) return pgPool.query(sql, values);
    throw new Error('Direct SQL queries not supported when using Supabase REST API mode. Use specific CRUD methods.');
  },
  on: (event, handler) => {
    if (pgPool) pgPool.on(event, handler);
  },
};

/**
 * Calculates server-side verified price for status and vitrine items.
 */
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
