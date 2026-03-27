import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/visual',
  testMatch: '*.test.js',
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  use: {
    browserName: 'chromium',
    colorScheme: 'dark',
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
