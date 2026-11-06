import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  use: {
    baseURL: 'http://localhost:4200',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
