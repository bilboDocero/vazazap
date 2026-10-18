import { getStatusPurchases } from '../../server/db.js';
import { endpoint } from '../../server/http.js';
export default endpoint('GET', async () => ({ purchases: await getStatusPurchases() }));
