import { test, expect } from '@playwright/test';

test('home favorites open their actual conversation', async ({ page }) => {
  test.skip(page.viewportSize().width <= 600, 'Home panel is desktop-only');
  await page.goto('/');
  await page.locator('.empty-state-chat').filter({ hasText: 'Martha Graeff' }).click();
  await expect(page.locator('.chat-header-name')).toHaveText('Martha Graeff');
  await expect(page.locator('.chat-msg-bubble').last()).toBeAttached();
});

test('history toolbar opens search and returns to the latest message', async ({ page }) => {
  await page.goto('/#/chat/martha-graeff');
  const messages = page.locator('.chat-messages');
  await expect(page.locator('.chat-day')).toHaveCount(5);
  await messages.evaluate(el => { el.scrollTop -= 500; });
  await page.getByRole('button', { name: 'Ir para as mensagens mais recentes' }).click();
  await expect.poll(() => messages.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Pesquisar neste histórico' }).click();
  const search = page.viewportSize().width <= 600
    ? page.locator('.mobile-search-input') : page.locator('.chat-search-input');
  await expect(search).toBeVisible();
  await search.fill('amor');
  if (page.viewportSize().width <= 600) {
    await expect(page.getByRole('button', { name: 'Próximo resultado' })).toBeVisible();
    await expect(page.locator('.msg-highlight')).toContainText(/amor/i);
  } else {
    await expect(page.locator('.chat-search-result-item').first()).toBeVisible();
  }
});

test('chat controls fit a narrow phone and remain keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Encontrar conversa' }).click();
  await expect(page.locator('.sidebar-search-input')).toBeFocused();
  await page.locator('[data-id="martha-graeff"]').click();
  await expect(page.locator('.chat-history-toolbar')).toBeVisible();
  for (const selector of ['.chat-header', '.chat-history-toolbar']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('tablet search keeps the chat width and closes back to the conversation', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/#/chat/martha-graeff');
  await expect(page.locator('.chat-history-toolbar')).toBeVisible();
  const before = await page.locator('.chat-view').boundingBox();
  await page.getByRole('button', { name: 'Pesquisar neste histórico' }).click();
  await expect(page.locator('.chat-search-drawer')).toHaveClass(/open/);
  const after = await page.locator('.chat-view').boundingBox();
  expect(after.width).toBe(before.width);
  await page.locator('.chat-search-drawer-close').click();
  await expect(page.locator('.chat-search-drawer')).toHaveCount(0);
  await expect(page.locator('.chat-header-name')).toHaveText('Martha Graeff');
});
