const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests/e2e',
  reporter: 'line',
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1,
  use: {
    baseURL: process.env.BASE_URL,
    headless: false,
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
    trace: 'retain-on-first-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
