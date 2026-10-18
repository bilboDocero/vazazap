import { endpoint, HttpError } from '../../server/http.js';
// Legacy gateway is disabled: it cannot authorize Stripe purchases.
export default endpoint('POST', async () => { throw new HttpError(410, 'Gateway desativado.'); });
