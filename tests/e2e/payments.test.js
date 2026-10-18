import { test, expect } from '@playwright/test';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

for (const type of ['status', 'vitrine']) {
  test(`${type}: review, recover from network error, then open hosted payment`, async ({ page }) => {
    const requests = [];
    await page.route('**/api/**', async route => {
      if (new URL(route.request().url()).pathname === '/api/payment/create') {
        requests.push(route.request().postDataJSON());
        if (requests.length === 1) return route.fulfill({ status: 503, json: { ok: false, error: 'Não foi possível iniciar o pagamento. Tente novamente.' } });
        return route.fulfill({ json: { ok: true, paymentStatus: 'pending', paymentId: 'cs_test_browser', checkoutUrl: 'https://checkout.stripe.com/c/pay/test' } });
      }
      return route.fulfill({ json: { ok: true, purchases: [], isConfigured: false } });
    });
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Checkout de teste</h1>' }));
    await page.goto('/');
    await page.evaluate(async type => {
      if (type === 'status') (await import('/src/components/StatusPurchaseModal.js')).openStatusPurchaseModal();
      else (await import('/src/components/VitrinePurchaseModal.js')).openVitrinePurchaseModal();
    }, type);
    await page.locator('.status-modal-overlay .status-btn-primary').click();
    await page.locator('.input-profile-name').fill('Anunciante de teste');
    await page.locator('.input-user-handle').fill('anunciante');
    await page.locator('input[type=file]').last().setInputFiles({ name: 'anuncio.png', mimeType: 'image/png', buffer: pixel });
    await expect(page.locator('.status-uploaded-tile')).toHaveCount(1);
    await page.locator('.input-caption').fill('Legenda preservada');
    await page.locator('.btn-advance-to-payment').click();
    await expect(page.locator('.status-step-preview')).toBeVisible();
    expect(requests).toHaveLength(0);
    await expect(page.getByText('Pagamento Confirmado', { exact: true })).toHaveCount(0);
    await page.locator('.btn-confirm-publish').click();
    await page.locator('[data-wallet="pix"]').click();
    await expect(page.locator('.payment-error-banner')).toContainText('Tente novamente');
    await expect(page.locator('[data-wallet="pix"]')).toBeEnabled();
    await page.locator('[data-wallet="pix"]').click();
    await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/test');
    expect(requests).toHaveLength(2);
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[0].media_files[0].caption).toBe('Legenda preservada');
    expect(requests[0].media_files[0].url).toMatch(/^data:image\/png;base64,/);
    expect(requests[0].type).toBe(type);
    expect(requests[0].purchase_token).toHaveLength(32);
  });
}
