import { test, expect } from '@playwright/test';

test.describe('System Health & Ecosystem', () => {
  test('debe cargar el dashboard y verificar que los servicios estén online', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await expect(page.locator('h1', { hasText: 'ERP Industrial' })).toBeVisible();

    // Check for Comercial module status to ensure backend communication is healthy
    // The badges will transition from "..." to "ONLINE" when the fetch resolves with a 2xx status
    const comercialBadge = page.locator('.status-card', { hasText: 'Comercial' }).locator('.status-badge');
    
    // A timeout of 10 seconds allows the backend (e.g. FastAPI/Docker) to wake up if it was idle
    await expect(comercialBadge).toHaveText('ONLINE', { timeout: 10000 });

    // Verify another core module
    const adminBadge = page.locator('.status-card', { hasText: 'Administracion' }).locator('.status-badge');
    await expect(adminBadge).toHaveText('ONLINE', { timeout: 10000 });
  });
});