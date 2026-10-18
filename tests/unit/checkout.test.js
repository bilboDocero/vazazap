import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleCheckoutReturn, safeCheckoutUrl, startCheckout } from '../../src/lib/checkout.js';
import { loadCachedStatuses, saveCachedStatuses } from '../../src/lib/status-db.js';
import { openStatusPurchaseModal } from '../../src/components/StatusPurchaseModal.js';
import { openVitrinePurchaseModal } from '../../src/components/VitrinePurchaseModal.js';

const identity = { id: 'purchase-1234567890123456', purchase_token: 'a'.repeat(32), type: 'status' };
const storageKey = `vorcarozap:checkout:${identity.id}`;
const response = data => ({ ok: true, json: async () => ({ ok: true, ...data }) });
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  localStorage.clear(); saveCachedStatuses([]); document.body.replaceChildren();
  history.replaceState({}, '', '/');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('stores only recovery credentials and sends all media before redirecting', async () => {
  fetch.mockResolvedValueOnce(response({ paymentId: 'cs_test_example', checkoutUrl: 'https://checkout.stripe.com/c/pay/test', paymentStatus: 'pending' }));
  const media = [{ url: 'https://example.com/a.png', caption: 'Anúncio completo' }];
  const result = await startCheckout({ ...identity, media_files: media });
  expect(result.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/test');
  expect(JSON.parse(fetch.mock.calls[0][1].body).media_files).toEqual(media);
  const saved = JSON.parse(localStorage.getItem(storageKey));
  expect(saved.purchase_token).toBe(identity.purchase_token);
  expect(saved).not.toHaveProperty('media_files');
  expect(loadCachedStatuses()).toEqual([]);
});
it('does not publish on failed creation and keeps credentials for recovery', async () => {
  fetch.mockRejectedValueOnce(new Error('Offline'));
  await expect(startCheckout(identity)).rejects.toThrow('Offline');
  expect(localStorage.getItem(storageKey)).toContain(identity.purchase_token);
  expect(loadCachedStatuses()).toEqual([]);
});
it('rejects arbitrary redirects and simulated success URLs', () => {
  for (const url of ['https://evil.example/pay', 'https://checkout.stripe.com.evil.example/pay', 'http://checkout.stripe.com/pay', 'https://www.vorcarozap.com/?payment=success']) expect(() => safeCheckoutUrl(url)).toThrow();
});
it('uses the saved identity and retains recovery data when confirmation fails', async () => {
  localStorage.setItem(storageKey, JSON.stringify({ ...identity, payment_id: 'cs_test_example' }));
  history.replaceState({}, '', `/#/status?payment=success&record_id=${identity.id}&session_id=cs_test_example`);
  fetch.mockResolvedValueOnce(response({ isPaid: true }));
  fetch.mockRejectedValueOnce(new Error('Offline'));
  await handleCheckoutReturn();
  expect(fetch.mock.calls[0][1].headers['X-Purchase-Token']).toBe(identity.purchase_token);
  expect(localStorage.getItem(storageKey)).not.toBeNull();
  expect(location.hash).toContain('session_id');
  expect(document.body.textContent).toContain('Verificar novamente');
  expect(loadCachedStatuses()).toEqual([]);
});
it('cleans recovery credentials only after server-confirmed publication', async () => {
  localStorage.setItem(storageKey, JSON.stringify({ ...identity, payment_id: 'cs_test_example' }));
  history.replaceState({}, '', `/#/status?payment=success&record_id=${identity.id}&session_id=cs_test_example`);
  fetch.mockResolvedValueOnce(response({ isPaid: true }));
  fetch.mockResolvedValueOnce(response({ purchase: { id: identity.id, payment_status: 'approved', media_files: [{ caption: 'Persistida' }] } }));
  await handleCheckoutReturn();
  expect(localStorage.getItem(storageKey)).toBeNull();
  expect(location.hash).toBe('#/status');
  expect(loadCachedStatuses()[0].media_files[0].caption).toBe('Persistida');
  expect(document.body.textContent).toContain('Seu anúncio foi publicado');
});
it('does not treat the success URL as proof of payment', async () => {
  localStorage.setItem(storageKey, JSON.stringify({ ...identity, payment_id: 'cs_test_example' }));
  history.replaceState({}, '', `/#/status?payment=success&record_id=${identity.id}`);
  fetch.mockResolvedValueOnce(response({ isPaid: false, status: 'pending' }));
  await handleCheckoutReturn();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(storageKey)).not.toBeNull();
  expect(document.body.textContent).toContain('ainda não confirmado');
});
it.each([['status', openStatusPurchaseModal], ['vitrine', openVitrinePurchaseModal]])('reviews %s content before requesting payment', async (type, open) => {
  open();
  const advance = document.querySelector('.btn-next-step1');
  // Locate the existing plan form's primary continue button.
  (advance || document.querySelector('.status-btn-primary')).click();
  const fileInput = document.querySelector('input[type="file"][accept*="image"]:not(.input-profile-pic)');
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  const mediaInput = inputs.find(input => input !== document.querySelector('.input-profile-pic')) || fileInput;
  // Use the actual media input selector; do not mock any payment handlers.
  const target = document.querySelector('.input-media-files') || inputs[inputs.length - 1];
  Object.defineProperty(target, 'files', { value: [new File(['image'], 'test.png', { type: 'image/png' })] });
  target.dispatchEvent(new Event('change', { bubbles: true }));
  await vi.waitFor(() => expect(document.querySelector('.status-uploaded-tile')).not.toBeNull());
  document.querySelector('.input-profile-name').value = 'Anunciante';
  document.querySelector('.input-user-handle').value = 'anunciante';
  document.querySelector('.status-publish-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.status-step-preview')).not.toBeNull();
  expect(document.body.textContent).not.toContain('Pagamento Confirmado');
  expect(fetch).not.toHaveBeenCalled();
  document.querySelector('.btn-confirm-publish').click();
  expect(document.querySelector('[data-wallet="pix"]')).not.toBeNull();
  expect(document.querySelector('[data-wallet="card"]')).not.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  document.querySelector('.status-modal-close').click();
});
