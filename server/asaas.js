import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

export function getAsaasConfig() {
  const env = process.env.ASAAS_ENVIRONMENT || 'sandbox';
  const defaultUrl = env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

  const baseUrl = (process.env.ASAAS_API_URL || defaultUrl).replace(/\/+$/, '');
  const apiKey = process.env.ASAAS_API_KEY || '';
  const isConfigured = Boolean(apiKey && apiKey.length > 5);

  return {
    baseUrl,
    apiKey,
    env,
    isConfigured,
    webhookSecret: process.env.ASAAS_WEBHOOK_SECRET || '',
  };
}

async function asaasFetch(endpoint, options = {}) {
  const config = getAsaasConfig();
  if (!config.isConfigured) {
    throw new Error('ASAAS_API_KEY is not configured in .env');
  }

  const url = `${config.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'access_token': config.apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'vorcarozap/1.0',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const errorMsg = json.errors?.[0]?.description || json.message || `Asaas HTTP error ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.details = json;
    throw err;
  }

  return json;
}

// ── CUSTOMER MANAGEMENT ──────────────────────────────────────────

export async function findOrCreateCustomer({ name, cpfCnpj, email, phone }) {
  const config = getAsaasConfig();
  if (!config.isConfigured) {
    return `cus_mock_${Date.now()}`;
  }

  const cleanCpf = (cpfCnpj || '').replace(/\D/g, '');
  const cleanPhone = (phone || '').replace(/\D/g, '');

  // 1. Search existing customer by CPF/CNPJ if provided
  if (cleanCpf) {
    try {
      const searchRes = await asaasFetch(`/customers?cpfCnpj=${cleanCpf}`);
      if (searchRes.data && searchRes.data.length > 0) {
        return searchRes.data[0].id;
      }
    } catch (err) {
      console.warn('[Asaas] Could not search customer by CPF:', err.message);
    }
  }

  // 2. Only include mobilePhone if provided and valid (never send dummy numbers with repeated digits)
  let validPhone = undefined;
  if (cleanPhone.length >= 10 && !/^(\d)\1+$/.test(cleanPhone)) {
    validPhone = cleanPhone;
  }

  let validEmail = undefined;
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    validEmail = email.trim();
  }

  // 3. Create customer without invalid/dummy phones
  const customerPayload = {
    name: (name || 'Anunciante VorcaroZap').trim(),
    cpfCnpj: cleanCpf || undefined,
    email: validEmail,
    mobilePhone: validPhone,
  };

  const created = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(customerPayload),
  });

  return created.id;
}

// ── PIX PAYMENT ──────────────────────────────────────────────────

export async function createPixPayment({ customerId, value, description, externalReference }) {
  const config = getAsaasConfig();

  // Development simulation if API key is not yet set
  if (!config.isConfigured) {
    const mockId = `pay_mock_${Date.now()}`;
    const mockPayload = `00020101021226730014br.gov.bcb.pix2551pix.asaas.com/qr/v2/${mockId}5204000053039865802BR5915vorcarozap_PAG6009SAO_PAULO62070503***6304`;
    // 1x1 green transparent pixel placeholder
    const mockQrCodeImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    return {
      payment: {
        id: mockId,
        status: 'PENDING',
        value,
        billingType: 'PIX',
        externalReference,
        simulated: true,
      },
      pix: {
        encodedImage: mockQrCodeImage,
        payload: mockPayload,
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
      },
    };
  }

  // Due date: tomorrow
  const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const paymentPayload = {
    customer: customerId,
    billingType: 'PIX',
    value: Math.round(Number(value) * 100) / 100,
    dueDate,
    description: (description || 'Publicação de Status no vorcarozap').slice(0, 500),
    externalReference: (externalReference || '').slice(0, 200),
  };

  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentPayload),
  });

  // Retrieve PIX QR Code & Copia e Cola
  const pix = await asaasFetch(`/payments/${payment.id}/pixQrCode`);

  return {
    payment,
    pix,
  };
}

// ── CREDIT CARD PAYMENT ──────────────────────────────────────────

export async function createCreditCardPayment({
  customerId,
  value,
  description,
  externalReference,
  remoteIp,
  creditCard,
  creditCardHolderInfo,
}) {
  const config = getAsaasConfig();

  if (!config.isConfigured) {
    const mockId = `pay_mock_card_${Date.now()}`;
    return {
      payment: {
        id: mockId,
        status: 'CONFIRMED',
        value,
        billingType: 'CREDIT_CARD',
        externalReference,
        simulated: true,
      },
    };
  }

  const dueDate = new Date().toISOString().split('T')[0];

  const cleanCpf = (creditCardHolderInfo.cpfCnpj || '').replace(/\D/g, '');
  const fallbackEmail = creditCardHolderInfo.email && creditCardHolderInfo.email.trim()
    ? creditCardHolderInfo.email.trim()
    : `faturamento.${cleanCpf || 'card'}@vorcarozap.com`;
  const fallbackPhone = (creditCardHolderInfo.phone || '').replace(/\D/g, '').length >= 10
    ? creditCardHolderInfo.phone.replace(/\D/g, '')
    : '11987654321';

  const paymentPayload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: Math.round(Number(value) * 100) / 100,
    dueDate,
    description: (description || 'Publicação de Status/Vitrine no vorcarozap').slice(0, 500),
    externalReference: (externalReference || '').slice(0, 200),
    remoteIp: remoteIp || '127.0.0.1',
    creditCard: {
      holderName: creditCard.holderName,
      number: creditCard.number.replace(/\D/g, ''),
      expiryMonth: String(creditCard.expiryMonth).padStart(2, '0'),
      expiryYear: String(creditCard.expiryYear).length === 2 ? `20${creditCard.expiryYear}` : String(creditCard.expiryYear),
      ccv: String(creditCard.ccv),
    },
    creditCardHolderInfo: {
      name: creditCardHolderInfo.name || 'Titular do Cartão',
      email: fallbackEmail,
      cpfCnpj: cleanCpf,
      postalCode: (creditCardHolderInfo.postalCode || '01001-000').replace(/\D/g, ''),
      addressNumber: creditCardHolderInfo.addressNumber || '1',
      phone: fallbackPhone,
    },
  };

  const payment = await asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentPayload),
  });

  return {
    payment,
  };
}

// ── PAYMENT STATUS CHECK ─────────────────────────────────────────

export async function getPaymentStatus(paymentId) {
  const config = getAsaasConfig();

  // Handle mock payments in development
  if (paymentId && paymentId.startsWith('pay_mock_')) {
    const createdTimestamp = parseInt(paymentId.replace(/\D/g, ''), 10) || Date.now();
    const elapsedSeconds = (Date.now() - createdTimestamp) / 1000;
    // Auto-approve after 4 seconds for instant testing
    const isPaid = elapsedSeconds >= 4;

    return {
      id: paymentId,
      status: isPaid ? 'RECEIVED' : 'PENDING',
      isPaid,
      value: 4.90,
      billingType: 'PIX',
      simulated: true,
    };
  }

  if (!config.isConfigured) {
    return {
      id: paymentId,
      status: 'CONFIRMED',
      isPaid: true,
      simulated: true,
    };
  }

  const payment = await asaasFetch(`/payments/${paymentId}`);
  const isPaid = payment.status === 'RECEIVED' || payment.status === 'CONFIRMED';

  return {
    id: payment.id,
    status: payment.status,
    isPaid,
    value: payment.value,
    netValue: payment.netValue,
    paymentDate: payment.paymentDate,
    billingType: payment.billingType,
  };
}
