import { endpoint, readRawBody, HttpError } from '../../server/http.js';
import { getStripe, getStripeConfig } from '../../server/stripe.js';
import { handleStripeEvent } from '../../server/payments.js';
export const config = { api: { bodyParser: false } };
export default endpoint('POST', async req => {
  const secret = getStripeConfig().webhookSecret;
  if (!secret) throw new HttpError(503, 'Webhook indisponível.');
  const signature = req.headers['stripe-signature'];
  if (!signature) throw new HttpError(400, 'Assinatura ausente.');
  const body = await readRawBody(req);
  let event;
  try { event = getStripe().webhooks.constructEvent(body, signature, secret); }
  catch { throw new HttpError(400, 'Assinatura inválida.'); }
  await handleStripeEvent(event);
  return { received: true };
});
