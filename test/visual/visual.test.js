import { test, expect } from '@playwright/test';

const harnessUrl = '/test/visual/harness.html';

const scenes = [
  'single-root',
  'shallow-tree',
  'deep-tree',
  'active-tab',
  'long-title',
  'missing-favicon',
  'many-tabs',
  'drag-dragging',
  'drag-over',
  'drag-gap-before',
  'drag-gap-after',
];

test.beforeEach(async ({ page }) => {
  await page.goto(harnessUrl);
  await page.waitForSelector('[data-scene]');
});

for (const scene of scenes) {
  test(`visual: ${scene}`, async ({ page }) => {
    const element = page.locator(`[data-scene="${scene}"]`);
    await expect(element).toHaveScreenshot(`${scene}.png`);
  });
}
