export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function sendJson(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

export async function readRawBody(req, limit = 4 * 1024 * 1024) {
  // Do not invoke Vercel's lazy JSON body getter: signature needs exact bytes.
  const body = Object.getOwnPropertyDescriptor(req, 'body')?.value;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body !== undefined) throw new HttpError(400, 'Corpo original do webhook indisponível.');
  // Vercel restores raw bodies through data/end listeners on a PassThrough.
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > limit) reject(new HttpError(413, 'Conteúdo muito grande. Use imagens menores.'));
      else chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
    req.on('aborted', () => reject(new HttpError(400, 'Requisição interrompida.')));
  });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse((await readRawBody(req)).toString('utf8') || '{}'); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'JSON inválido.');
  }
}

export function endpoint(method, action) {
  return async (req, res) => {
    if (req.method !== method) {
      res.setHeader('Allow', method);
      return sendJson(res, 405, { ok: false, error: 'Método não permitido.' });
    }
    try { return sendJson(res, 200, { ok: true, ...await action(req) }); }
    catch (error) {
      console.error('[API Error]', error);
      // Provider/DB messages may contain customer data; don't return or log them.
      const status = error instanceof HttpError ? error.status : 503;
      return sendJson(res, status, { ok: false, error: error instanceof HttpError ? error.message : 'Não foi possível confirmar a operação. Tente novamente.' });
    }
  };
}
