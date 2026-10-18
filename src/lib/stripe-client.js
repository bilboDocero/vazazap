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
  if (!containerEl) return { available: false };

  try {
    const stripe = await getStripe();
    if (!stripe) return { available: false };

    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents <= 0) return { available: false };

    const paymentRequest = stripe.paymentRequest({
      country: 'BR',
      currency: 'brl',
      total: {
        label: label || 'VorcaroZap Story',
        amount: amountCents,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    const result = await paymentRequest.canMakePayment();

    if (!result) {
      return { available: false };
    }

    // Container markup with wallet button
    containerEl.replaceChildren();

    const titleEl = document.createElement('div');
    titleEl.className = 'wallet-button-heading';
    titleEl.innerHTML = `
      <span class="wallet-badge">1 Clique</span>
      <span>Pagar com Carteira Digital:</span>
    `;

    const buttonMount = document.createElement('div');
    buttonMount.className = 'stripe-wallet-button-mount';

    const dividerEl = document.createElement('div');
    dividerEl.className = 'wallet-or-divider';
    dividerEl.innerHTML = '<span>OU PAGAR COM PIX / CARTÃO</span>';

    containerEl.append(titleEl, buttonMount, dividerEl);

    const elements = stripe.elements();
    const prButton = elements.create('paymentRequestButton', {
      paymentRequest,
      style: {
        paymentRequestButton: {
          type: 'buy',
          theme: 'dark',
          height: '46px',
        },
      },
    });

    prButton.mount(buttonMount);

    paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: ev.paymentMethod.id,
            billingType: 'WALLET',
            type,
            plan_type: planType,
            file_count: fileCount,
            profile_name: customerName,
            customer: {
              name: ev.payerName || customerName,
              email: ev.payerEmail || '',
            },
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok || data.paymentStatus !== 'approved') {
          ev.complete('fail');
          onPaymentError?.(new Error(data.error || 'Pagamento recusado pela carteira digital.'));
          return;
        }

        ev.complete('success');
        onPaymentSuccess?.(data);
      } catch (err) {
        ev.complete('fail');
        onPaymentError?.(err);
      }
    });

    return {
      available: true,
      applePay: Boolean(result.applePay),
      googlePay: Boolean(result.googlePay),
      link: Boolean(result.link),
    };
  } catch (err) {
    console.warn('[Stripe Wallet Mount Error]', err);
    return { available: false };
  }
}
