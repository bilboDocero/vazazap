import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;
let cachedConfig = null;

export async function fetchStripeConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch('/api/payment/config');
    if (res.ok) {
      cachedConfig = await res.json();
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[Stripe Config Fetch Error]', err);
  }
  return { ok: false, publishableKey: '', isConfigured: false };
}

export async function getStripe() {
  if (stripePromise) return stripePromise;
  const config = await fetchStripeConfig();
  if (!config.publishableKey) return null;

  stripePromise = loadStripe(config.publishableKey);
  return stripePromise;
}

/**
 * Initializes and mounts native Apple Pay / Google Pay / Link button if supported
 * by the user's browser, OS and device.
 */
export async function mountWalletButton({
  containerEl,
  amount,
  label,
  customerName,
  type = 'status',
  planType = 'status_normal',
  fileCount = 1,
  onPaymentSuccess,
  onPaymentError,
}) {
  // O paymentRequestButton foi descontinuado na versão moderna do Stripe.js em favor
  // dos botões dedicados de carteira digital já estilizados no modal (.wallet-buttons-stack).
  return { available: false };
}
