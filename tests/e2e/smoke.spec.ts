// Pizzico — tests/e2e/smoke.spec.ts
// Riferimento manifesto: §11 Step 7
// Licenza: MIT OR Apache-2.0

import { test, expect } from '@playwright/test';

test.describe('Pizzico Shell Smoke Tests', () => {
  test('should load application shell and render canvas', async ({ page }) => {
    await page.goto('/');

    // Verifica brand title
    await expect(page.locator('.pz-brand')).toContainText('Pizzico');

    // Verifica presenza canvas viewport
    const canvas = page.locator('canvas.pz-canvas-element');
    await expect(canvas).toBeVisible();

    // Verifica presenza toolbar
    const toolbar = page.locator('.pz-left-toolbar');
    await expect(toolbar).toBeVisible();

    // Verifica presenza floating HUD
    const hud = page.locator('.pz-floating-hud');
    await expect(hud).toBeVisible();
  });
});
