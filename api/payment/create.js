import { endpoint, readJson } from '../../server/http.js';
import { createPayment } from '../../server/payments.js';
export default endpoint('POST', async req => createPayment(await readJson(req)));
