import { createStatusPurchase } from './status-db.js';
import { createVitrinePurchase } from './vitrine-db.js';
import '../styles/payment-return.css';

const storageKey = id => `vorcarozap:checkout:${id}`;
export function checkoutIdentity() {
  return { id: crypto.randomUUID(), purchase_token: crypto.randomUUID().replaceAll('-', '') };
}
export function safeCheckoutUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Endereço de pagamento inválido.');
  return url.href;
}
export async function startCheckout(payload) {
  if (new Blob([JSON.stringify(payload)]).size > 3 * 1024 * 1024) throw new Error('As imagens são muito grandes. Reduza o tamanho antes de pagar.');
  // Persist only the recovery credential, not heavy images or card details.
  const key = storageKey(payload.id);
  localStorage.setItem(key, JSON.stringify({ id: payload.id, purchase_token: payload.purchase_token, type: payload.type }));
  const response = await fetch('/api/payment/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
  const saved = { id: payload.id, purchase_token: payload.purchase_token, type: payload.type, payment_id: data.paymentId, checkoutUrl: data.checkoutUrl ? safeCheckoutUrl(data.checkoutUrl) : null };
  localStorage.setItem(key, JSON.stringify(saved));
  if (data.paymentStatus === 'approved') {
    const purchase = await (payload.type === 'status' ? createStatusPurchase(saved) : createVitrinePurchase(saved));
    localStorage.removeItem(key);
    return { purchase };
  }
  if (!saved.checkoutUrl) throw new Error('Pagamento em processamento. Aguarde a confirmação.');
  return { checkoutUrl: saved.checkoutUrl };
}

let checking = false;
export async function handleCheckoutReturn() {
  const params = new URLSearchParams(location.search || location.hash.split('?')[1] || '');
  const recordId = params.get('record_id');
  if (!recordId || !['success', 'cancel'].includes(params.get('payment')) || checking) return;
  let notice = document.querySelector('.payment-return-notice');
  if (!notice) {
    notice = document.createElement('aside');
    notice.className = 'payment-return-notice';
    notice.setAttribute('role', 'status');
    document.body.appendChild(notice);
  }
  const message = (text, retry, checkoutUrl) => {
    notice.replaceChildren();
    const span = document.createElement('span'); span.textContent = text; notice.append(span);
    if (retry) {
      const button = document.createElement('button'); button.textContent = 'Verificar novamente';
      button.onclick = () => handleCheckoutReturn(); notice.append(button);
    }
    if (checkoutUrl) {
      const link = document.createElement('a'); link.textContent = 'Retomar pagamento'; link.href = safeCheckoutUrl(checkoutUrl); notice.append(link);
    }
    const close = document.createElement('button'); close.textContent = 'Fechar'; close.onclick = () => notice.remove(); notice.append(close);
  };
  checking = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(recordId)) || 'null');
    if (!saved || !['status', 'vitrine'].includes(saved.type)) {
      message('A confirmação será processada automaticamente. Para consultar esta compra, use o navegador em que iniciou o pagamento.');
      return;
    }
    message('Verificando pagamento…');
    const query = new URLSearchParams({ recordId, type: saved.type, paymentId: params.get('session_id') || saved.payment_id || '' });
    const response = await fetch(`/api/payment/status?${query}`, { headers: { 'X-Purchase-Token': saved.purchase_token } });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível consultar o pagamento.');
    if (data.isPaid) {
      await (saved.type === 'status' ? createStatusPurchase(saved) : createVitrinePurchase(saved));
      localStorage.removeItem(storageKey(recordId));
      history.replaceState({}, '', location.pathname + '#/' + saved.type);
      message('Pagamento confirmado. Seu anúncio foi publicado.');
    } else if (['expired', 'failed', 'refunded', 'disputed'].includes(data.status)) {
      message('Esta compra não está liberada para publicação. Situação: ' + ({ expired: 'expirada', failed: 'pagamento não concluído', refunded: 'reembolsada', disputed: 'em análise' })[data.status] + '.');
    } else message('Pagamento ainda não confirmado. A publicação acontecerá após a confirmação.', true, saved.checkoutUrl);
  } catch (error) {
    message(error.message || 'Não foi possível verificar o pagamento. Tente novamente.', true);
  } finally { checking = false; }
}
