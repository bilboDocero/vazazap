import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'payments.test.js', fullyParallel: true,
  reporter: 'line', use: { baseURL: 'http://127.0.0.1:5184', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5184 --strictPort',
    url: 'http://127.0.0.1:5184', cwd: '../..', reuseExistingServer: false,
    env: { VITEST: 'true', NODE_ENV: 'test', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '' },
  },
});
