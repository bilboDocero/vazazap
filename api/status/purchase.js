import { endpoint, readJson, HttpError } from '../../server/http.js';
import { checkPayment } from '../../server/payments.js';
// Compatibility endpoint: returns the immutable, server-confirmed purchase.
// It never creates, edits, deletes or approves a purchase from client claims.
export default endpoint('POST', async req => {
  const body = await readJson(req);
  const result = await checkPayment({ type: 'status', recordId: body.id, paymentId: body.payment_id, token: body.purchase_token });
  if (!result.isPaid) throw new HttpError(409, 'Pagamento ainda não confirmado.');
  return { purchase: result.purchase };
});
