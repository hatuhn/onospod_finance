import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'pages.spec.ts',workers:2,use:{baseURL:'http://127.0.0.1:3200',viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME}},webServer:{command:'node scripts/serve_pages.mjs',url:'http://127.0.0.1:3200/onospod_finance-demo/',reuseExistingServer:true}});
