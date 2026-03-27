import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/visual',
  testMatch: '*.test.js',
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  projects: [
    {
      name: 'light',
      use: { browserName: 'chromium', colorScheme: 'light' },
    },
    {
      name: 'dark',
      use: { browserName: 'chromium', colorScheme: 'dark' },
    },
  ],
  use: {
    baseURL: 'http://localhost:3100',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: 'npx serve . -l 3100 --no-clipboard',
    port: 3100,
    reuseExistingServer: true,
  },
});
