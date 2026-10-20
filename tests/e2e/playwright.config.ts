// Pizzico — tests/e2e/playwright.config.ts
// Riferimento manifesto: §3.1, §11 Step 7
// Licenza: MIT OR Apache-2.0

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chromium (WebGPU)',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-webgpu'],
        },
      },
    },
    {
      name: 'Mobile Chrome (Touch)',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'Mobile Safari (iOS)',
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter @pizzico/app-web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
