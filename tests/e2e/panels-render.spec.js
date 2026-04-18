import { test, expect } from '@playwright/test';

test.describe('UI Integration & Panels Rendering', () => {
  test('debe cambiar de panel al hacer clic en las tarjetas de los módulos', async ({ page }) => {
    await page.goto('/');

    // Initially no tester-panel should be visible
    await expect(page.locator('.tester-panel')).not.toBeVisible();

    // Click on the Administracion module
    await page.locator('.status-card', { hasText: 'Administracion' }).click();
    await expect(page.locator('.tester-panel')).toBeVisible();
    await expect(page.locator('.tester-panel h2', { hasText: 'Administracion' })).toBeVisible();
    
    // Deselect Administracion
    await page.locator('.status-card', { hasText: 'Administracion' }).click();
    await expect(page.locator('.tester-panel')).not.toBeVisible();

    // Click on the Comercial module
    await page.locator('.status-card', { hasText: 'Comercial' }).click();
    await expect(page.locator('.tester-panel')).toBeVisible();
    await expect(page.locator('.tester-panel h2', { hasText: 'Comercial' })).toBeVisible();

    // Verify a known endpoint from the Comercial module renders correctly
    await expect(page.locator('h3', { hasText: 'Crear Orden de Fabricacion' })).toBeVisible();
  });
});