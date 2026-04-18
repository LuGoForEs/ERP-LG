import { test, expect } from '@playwright/test';

test.describe('Core Workflows & API Integrity', () => {
  test('Flujo Comercial: Crear Orden de Fabricación', async ({ page }) => {
    await page.goto('/');

    // 1. Open the Comercial Panel
    await page.locator('.status-card', { hasText: 'Comercial' }).click();

    // 2. Find the form for Creating a Manufacturing Order
    const ofCard = page.locator('.endpoint-card', { has: page.locator('h3', { hasText: 'Crear Orden de Fabricacion' }) });
    
    // 3. Fill in the form fields
    await ofCard.locator('input[placeholder*="Aceros del Sur"]').fill('Test Cliente Playwright');
    await ofCard.locator('input[placeholder*="Tanque acero"]').fill('Test Descripcion Playwright');
    await ofCard.locator('input[placeholder*="30 dias"]').fill('15 dias');
    await ofCard.locator('input[placeholder*="500000"]').fill('100000');

    // 4. Intercept the API request to validate payload structure
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/v1/comercial/ordenes-fabricacion') && req.method() === 'POST');
    
    // Optionally wait for response if we were guaranteeing backend is fully populated.
    // We only strictly validate that the frontend sent what we expect for this test case.
    await ofCard.locator('button[type="submit"]').click();
    
    const request = await requestPromise;
    const postData = request.postDataJSON();
    
    // Verify the generated payload perfectly matches the schema requirements
    expect(postData).toMatchObject({
      cliente: 'Test Cliente Playwright',
      descripcion: 'Test Descripcion Playwright',
      plazo_entrega: '15 dias',
      monto_anticipo: '100000'
    });
  });

  test('Flujo Administracion: Validar Anticipo con Variables Dinámicas', async ({ page }) => {
    await page.goto('/');

    // 1. Open the Administracion Panel
    await page.locator('.status-card', { hasText: 'Administracion' }).click();

    // 2. Find the Validate Advance form
    const validarCard = page.locator('.endpoint-card', { has: page.locator('h3', { hasText: 'Validar Anticipo' }) });

    // 3. Fill in the dynamic path parameter and body payload
    await validarCard.locator('input[placeholder*="Ej: 1"]').fill('999'); // ID Anticipo Path Param
    await validarCard.locator('input[placeholder*="FC-2024"]').fill('FC-TEST-123'); // Nro Factura Body
    
    // Click the toggle logic (Anticipo Pagado -> True)
    await validarCard.locator('.toggle').click();

    // 4. Ensure the React state interpolated the path parameter into the URL correctly
    const requestPromise = page.waitForRequest(req => 
      req.url().includes('/api/v1/administracion/anticipos/999/validar') && req.method() === 'PUT'
    );
    
    await validarCard.locator('button[type="submit"]').click();
    
    const request = await requestPromise;
    const postData = request.postDataJSON();
    
    // Validate boolean type logic
    expect(postData).toMatchObject({
      factura_pago: 'FC-TEST-123',
      pagado: true
    });
  });
});