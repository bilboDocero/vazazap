import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'search.test.js', fullyParallel: true,
  workers: 2, reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5187', trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', cwd: '../..', reuseExistingServer: !process.env.CI,
    env: { VITEST: 'true', NODE_ENV: 'test', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '' },
  },
});
