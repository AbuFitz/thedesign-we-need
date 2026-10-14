// @ts-check
import { defineConfig, devices } from '@playwright/test';

const PORT = 8945;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node scripts/dev-server.mjs ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 20000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        launchOptions: { executablePath: '/opt/pw-browsers/chromium', args: ['--headless=new', '--no-sandbox'] },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
        // 'iPhone 12' is a WebKit device descriptor by default (real iPhones run
        // Safari). Force Chromium explicitly since only a Chromium binary is
        // available in this environment — otherwise Playwright tries to drive
        // the Chromium binary with WebKit's protocol and the browser process
        // exits immediately.
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        launchOptions: { executablePath: '/opt/pw-browsers/chromium', args: ['--headless=new', '--no-sandbox'] },
      },
    },
  ],
});
