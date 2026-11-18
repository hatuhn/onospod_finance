import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore:'**/pages.spec.ts',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: {width: 1440, height: 1000},
    launchOptions: {executablePath: process.env.PLAYWRIGHT_CHROME},
  },
  webServer: {command: 'npm run start -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/admin/finance-demo', reuseExistingServer: true},
});
