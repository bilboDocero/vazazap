import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'radar',
  password: process.env.PGPASSWORD || 'radar_local',
  database: process.env.PGDATABASE || 'vorcarozap',
  connectionTimeoutMillis: 3000,
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function statusApiMiddleware(req, res, next) {
  if (!req.url || !req.url.startsWith('/api/status')) {
    return next();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // GET /api/status/purchases
  if (req.method === 'GET' && pathname === '/api/status/purchases') {
    pool.query('SELECT * FROM status_purchases ORDER BY published_at DESC')
      .then(result => {
        sendJson(res, 200, { ok: true, purchases: result.rows });
      })
      .catch(err => {
        console.error('[PostgreSQL API Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message, purchases: [] });
      });
    return;
  }

  // POST /api/status/purchase
  if (req.method === 'POST' && pathname === '/api/status/purchase') {
    readJsonBody(req)
      .then(body => {
        const id = body.id || `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const planType = body.plan_type || 'status_normal';
        const fileCount = Number(body.file_count) || 1;
        const unitPrice = Number(body.unit_price) || (planType === 'status_impulsionado' ? 149.00 : 4.90);
        const discountAmount = Number(body.discount_amount) || 0;
        const totalPrice = Number(body.total_price) || (unitPrice * fileCount - discountAmount);
        const paymentStatus = body.payment_status || 'approved';
        const profileName = body.profile_name || 'Usuário';
        const userHandle = body.user_handle || '@user';
        const socialNetwork = body.social_network || 'instagram';
        const socialLink = body.social_link || `https://instagram.com/${userHandle.replace(/^@/, '')}`;
        const caption = body.caption || '';
        const profilePic = body.profile_pic || '';
        const mediaFiles = JSON.stringify(body.media_files || []);

        const query = `
          INSERT INTO status_purchases (
            id, plan_type, file_count, unit_price, discount_amount, total_price,
            payment_status, profile_name, user_handle, social_network, social_link,
            caption, profile_pic, media_files, published_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW(), NOW())
          RETURNING *;
        `;

        const values = [
          id, planType, fileCount, unitPrice, discountAmount, totalPrice,
          paymentStatus, profileName, userHandle, socialNetwork, socialLink,
          caption, profilePic, mediaFiles
        ];

        return pool.query(query, values);
      })
      .then(result => {
        sendJson(res, 201, { ok: true, purchase: result.rows[0] });
      })
      .catch(err => {
        console.error('[PostgreSQL Purchase Error]', err.message);
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  // DELETE /api/status/purchase/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/status/purchase/')) {
    const id = pathname.replace('/api/status/purchase/', '');
    pool.query('DELETE FROM status_purchases WHERE id = $1 RETURNING id', [id])
      .then(result => {
        sendJson(res, 200, { ok: true, deleted: result.rowCount > 0 });
      })
      .catch(err => {
        sendJson(res, 500, { ok: false, error: err.message });
      });
    return;
  }

  next();
}
