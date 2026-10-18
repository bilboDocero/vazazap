import { endpoint } from '../../server/http.js';
import { checkPayment } from '../../server/payments.js';
export default endpoint('GET', async req => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  return checkPayment({ type: params.get('type'), recordId: params.get('recordId'), paymentId: params.get('paymentId'), token: req.headers['x-purchase-token'] });
});
