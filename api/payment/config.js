import { getStripeConfig } from '../../server/stripe.js';
import { endpoint } from '../../server/http.js';
export default endpoint('GET', async () => {
  const config = getStripeConfig();
  return { publishableKey: config.publishableKey, isConfigured: config.isConfigured && Boolean(config.webhookSecret) };
});
