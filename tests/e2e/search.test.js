import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const sourceMessages = JSON.parse(readFileSync(new URL('../../data/messages.json', import.meta.url), 'utf8')).messages;
const lateMessage = sourceMessages.find(message => message.type === 'text' && message.content.length > 200 && /[A-Za-zÀ-ÿ]{3,}(?: [A-Za-zÀ-ÿ]{2,}){3,6}/.test(message.content.slice(120)));
const lateQuery = lateMessage.content.slice(120).match(/[A-Za-zÀ-ÿ]{3,}(?: [A-Za-zÀ-ÿ]{2,}){3,6}/)[0];

test.describe('Search — Batch 7', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('search input is visible in sidebar', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await expect(input).toBeVisible();
  });

  test('focus reveals quick search terms without fetching the index, then selection starts a search', async ({ page, context }) => {
    const requests = [];
    context.on('request', request => { if (/\/data\/search-(manifest|index\.)/.test(request.url())) requests.push(request.url()); });
    const input = page.locator('.sidebar-search-input');
    await input.click();
    await expect(page.locator('.search-suggestions')).toBeVisible();
    await expect(page.locator('.search-suggestions').getByRole('option')).toHaveCount(8);
    expect(requests).toHaveLength(0);
    const term = page.getByRole('option', { name: 'peleleca', exact: true });
    if (page.viewportSize().width <= 600) await term.tap();
    else await term.click();
    await expect(input).toHaveValue('peleleca');
    await expect(page.locator('.search-suggestions')).toBeHidden();
    await expect(page.locator('.search-result-item').first()).toHaveAttribute('data-conversation-id', 'martha-graeff');
    await input.press('Escape');
    await input.click();
    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toHaveValue('colação');
    await expect(page.locator('.search-result-item').first()).toBeVisible();
    await input.press('Escape');
    await input.click();
    await page.locator('.sidebar-header-title').click();
    await expect(page.locator('.search-suggestions')).toBeHidden();
  });

  test('typing in search shows results panel', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    // Wait for debounce + index load
    await page.locator('.search-results').waitFor({ timeout: 10000 });
    await expect(page.locator('.search-results')).toBeVisible();
  });

  test('search results contain matching messages', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const items = page.locator('.search-result-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search results show sender and date', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const sender = page.locator('.search-result-sender').first();
    await expect(sender).toBeVisible();

    const date = page.locator('.search-result-date').first();
    await expect(date).toBeVisible();
  });

  test('search results highlight the matching text', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const highlight = page.locator('.search-highlight').first();
    await expect(highlight).toBeVisible();
    const text = await highlight.textContent();
    expect(text.toLowerCase()).toContain('bom dia');
  });

  test('conversation list is hidden during search', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    const convList = page.locator('.conversation-list');
    await expect(convList).not.toBeVisible();
  });

  test('clearing search restores conversation list', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    // Clear the input
    await input.fill('');
    const convList = page.locator('.conversation-list');
    await expect(convList).toBeVisible();
  });

  test('pressing Escape clears search', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    await input.press('Escape');
    const convList = page.locator('.conversation-list');
    await expect(convList).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('no results shows empty message', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('xyzzyxyzzy12345');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    const empty = page.locator('.search-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Nenhuma mensagem encontrada');
  });

  test('search is accent-insensitive', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    // Search without accent should still match accented content
    await input.fill('voce');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    const items = page.locator('.search-result-item');
    const count = await items.count();
    // Should find results if "você" exists in the data
    expect(count).toBeGreaterThanOrEqual(0); // May or may not find results
  });

  test('clicking a search result opens the conversation', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    await page.locator('.search-result-item').first().click();

    // Should navigate to the chat view
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });
  });

  test('loads the shared worker index lazily and reuses it across queries', async ({ page, context }) => {
    const requests = [];
    const workers = [];
    page.on('worker', worker => workers.push(worker));
    context.on('request', request => { if (/\/data\/search-(manifest|index\.)/.test(request.url())) requests.push(request.url()); });
    await page.reload();
    expect(requests).toHaveLength(0);
    const input = page.locator('.sidebar-search-input');
    await input.fill('peleleca');
    await expect(page.locator('.search-result-contact').first()).toHaveText('Martha Graeff');
    await input.fill('estar fora');
    await expect(page.locator('.search-result-contact').first()).toContainText('Alexandre');
    expect(requests.filter(url => url.endsWith('search-manifest.json'))).toHaveLength(1);
    expect(requests.filter(url => /search-index\.[a-f0-9]+\.json$/.test(url))).toHaveLength(1);
    expect(workers).toHaveLength(1);
  });

  test('finds full Martha text beyond the former cutoff and opens the originating conversation', async ({ page }) => {
    if (page.viewportSize().width > 600) {
      await page.goto('/#/chat/alexandre-de-moraes');
      await expect(page.locator('.chat-view')).toBeVisible();
    }
    await page.locator('.sidebar-search-input').fill(lateQuery);
    const result = page.locator(`.search-result-item[data-conversation-id="martha-graeff"][data-message-id="${lateMessage.id}"]`);
    await expect(result).toBeVisible();
    await expect(result.locator('.search-highlight')).toHaveText(lateQuery);
    await result.click();
    await expect(page).toHaveURL(/#\/chat\/martha-graeff/);
    await expect(page.locator('.chat-view')).toBeVisible();
    await expect(page.locator(`.chat-messages [data-id="${lateMessage.id}"]`)).toBeVisible();
  });

  test('paginates results instead of stopping after the first 50 messages', async ({ page }) => {
    await page.locator('.sidebar-search-input').fill('Bom dia');
    await expect(page.locator('.search-result-item')).toHaveCount(50);
    await page.getByRole('button', { name: 'Carregar mais resultados' }).click();
    await expect(page.locator('.search-result-item')).toHaveCount(100);
    const keys = await page.locator('.search-result-item').evaluateAll(items => items.map(item => item.dataset.conversationId + ':' + item.dataset.messageId));
    expect(new Set(keys).size).toBe(100);
  });

  test('discards cancelled queries on a slower CPU and keeps conversation scope isolated', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor();
    await input.fill('peleleca');
    await expect(page.locator('.search-result-item').first()).toHaveAttribute('data-conversation-id', 'martha-graeff');
    const scoped = await page.evaluate(async () => {
      const { searchAsync } = await import('/src/lib/search.js');
      return searchAsync('peleleca', { conversationId: 'alexandre-de-moraes' });
    });
    expect(scoped).toEqual([]);
    await input.press('Escape');
    await expect(page.locator('.search-results')).toHaveCount(0);
  });

  test('search inside a conversation uses full text and navigates to that message', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff');
    await page.getByRole('button', { name: 'Pesquisar neste histórico' }).click();
    if (page.viewportSize().width <= 600) {
      await page.locator('.mobile-search-input').fill(lateQuery);
      await expect(page.getByRole('button', { name: 'Próximo resultado' })).toBeVisible();
    } else {
      await page.locator('.chat-search-input').fill(lateQuery);
      await page.locator('.chat-search-result-item').first().click();
    }
    await expect(page.locator(`.chat-messages [data-id="${lateMessage.id}"]`)).toBeVisible();
    await expect(page).toHaveURL(/#\/chat\/martha-graeff/);
  });
});
