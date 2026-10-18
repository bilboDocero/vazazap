import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Stripe from 'stripe';

// Synchronously load .env if present
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore environment load issues
  }
}
loadEnv();

let stripeClient = null;

export function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const isConfigured = Boolean(secretKey && secretKey.startsWith('sk_'));

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isConfigured,
  };
}

export function getStripe() {
  const config = getStripeConfig();
  if (!config.isConfigured) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey, {
      apiVersion: '2024-06-20',
      appInfo: {
        name: 'VorcaroZap',
        version: '1.0.0',
      },
    });
  }

  return stripeClient;
}

// ── STRIPE PIX PAYMENT ────────────────────────────────────────────

export async function createStripePixPayment({
  value,
  description,
  recordId,
  type = 'status',
  planType = 'status_normal',
  customerName = 'Anunciante VorcaroZap',
  cpfCnpj = '',
}) {
  const config = getStripeConfig();
  const stripe = getStripe();

  // Development simulation if Stripe is not yet configured
  if (!stripe) {
    const mockId = `pi_mock_pix_${Date.now()}`;
    const mockPayload = `00020101021226840014br.gov.bcb.pix2562pix.stripe.com/qr/v2/${mockId}5204000053039865802BR5912STRIPE_BRASIL6009SAO_PAULO62070503***6304`;
    // 1x1 green transparent pixel placeholder
    const mockQrCodeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    return {
      paymentId: mockId,
      status: 'requires_action',
      billingType: 'PIX',
      pix: {
        payload: mockPayload,
        imageUrl: mockQrCodeImage,
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
      },
      simulated: true,
    };
  }

  const cleanCpf = (cpfCnpj || '').replace(/\D/g, '');
  const amountCents = Math.round(Number(value) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'brl',
    payment_method_types: ['pix'],
    payment_method_data: {
      type: 'pix',
    },
    confirm: true,
    description: (description || `VorcaroZap - ${type} (${planType})`).slice(0, 500),
    metadata: {
      recordId: recordId || '',
      type: type || 'status',
      planType: planType || '',
      cpf: cleanCpf,
      name: (customerName || '').slice(0, 100),
    },
  });

  const pixDetails = paymentIntent.next_action?.pix_display_qr_code;

  return {
    paymentIntent,
    paymentId: paymentIntent.id,
    status: paymentIntent.status,
    billingType: 'PIX',
    pix: {
      payload: pixDetails?.data || '',
      imageUrl: pixDetails?.image_url_png || pixDetails?.image_url_svg || '',
      expiresAt: pixDetails?.expires_at,
    },
    simulated: false,
  };
}

// ── STRIPE CREDIT CARD PAYMENT ────────────────────────────────────

export async function createStripeCardPayment({
  value,
  description,
  recordId,
  type = 'status',
  planType = 'status_normal',
  customerName = 'Anunciante VorcaroZap',
  cpfCnpj = '',
  creditCard,
  postalCode = '01001-000',
}) {
  const stripe = getStripe();

  if (!stripe) {
    const mockId = `pi_mock_card_${Date.now()}`;
    return {
      paymentId: mockId,
      status: 'succeeded',
      billingType: 'CREDIT_CARD',
      simulated: true,
    };
  }

  const cleanCpf = (cpfCnpj || '').replace(/\D/g, '');
  const amountCents = Math.round(Number(value) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'brl',
    payment_method_types: ['card'],
    payment_method_data: {
      type: 'card',
      card: {
        number: creditCard.number.replace(/\D/g, ''),
        exp_month: Number(creditCard.expiryMonth),
        exp_year: Number(String(creditCard.expiryYear).length === 2 ? `20${creditCard.expiryYear}` : creditCard.expiryYear),
        cvc: String(creditCard.ccv),
      },
      billing_details: {
        name: creditCard.holderName || customerName,
        address: {
          postal_code: (postalCode || '01001-000').replace(/\D/g, ''),
          country: 'BR',
        },
      },
    },
    confirm: true,
    description: (description || `VorcaroZap - ${type} (${planType})`).slice(0, 500),
    metadata: {
      recordId: recordId || '',
      type: type || 'status',
      planType: planType || '',
      cpf: cleanCpf,
      name: (customerName || '').slice(0, 100),
    },
  });

  return {
    paymentIntent,
    paymentId: paymentIntent.id,
    status: paymentIntent.status,
    billingType: 'CREDIT_CARD',
    simulated: false,
  };
}

// ── STRIPE DIGITAL WALLET PAYMENT (APPLE PAY, GOOGLE PAY, LINK) ───

export async function createStripePaymentWithMethod({
  paymentMethodId,
  value,
  description,
  recordId,
  type = 'status',
  planType = 'status_normal',
  customerName = 'Anunciante VorcaroZap',
  cpfCnpj = '',
}) {
  const stripe = getStripe();

  if (!stripe) {
    const mockId = `pi_mock_wallet_${Date.now()}`;
    return {
      paymentId: mockId,
      status: 'succeeded',
      billingType: 'WALLET',
      simulated: true,
    };
  }

  const cleanCpf = (cpfCnpj || '').replace(/\D/g, '');
  const amountCents = Math.round(Number(value) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'brl',
    payment_method: paymentMethodId,
    confirm: true,
    return_url: 'https://vorcarozap.com',
    description: (description || `VorcaroZap - ${type} (${planType})`).slice(0, 500),
    metadata: {
      recordId: recordId || '',
      type: type || 'status',
      planType: planType || '',
      cpf: cleanCpf,
      name: (customerName || '').slice(0, 100),
    },
  });

  return {
    paymentIntent,
    paymentId: paymentIntent.id,
    status: paymentIntent.status,
    billingType: 'WALLET',
    simulated: false,
  };
}

// ── STRIPE STATUS CHECK (POLLING) ─────────────────────────────────

export async function getStripePaymentStatus(paymentId) {
  if (paymentId && paymentId.startsWith('pi_mock_')) {
    const createdTimestamp = parseInt(paymentId.replace(/\D/g, ''), 10) || Date.now();
    const elapsedSeconds = (Date.now() - createdTimestamp) / 1000;
    const isPaid = elapsedSeconds >= 4;

    return {
      id: paymentId,
      status: isPaid ? 'succeeded' : 'requires_action',
      isPaid,
      simulated: true,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      id: paymentId,
      status: 'succeeded',
      isPaid: true,
      simulated: true,
    };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
  const isPaid = paymentIntent.status === 'succeeded';

  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    isPaid,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
  };
}
