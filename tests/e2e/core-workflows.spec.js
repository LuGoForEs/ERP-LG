import { test, expect } from '@playwright/test';

test.describe.serial('Core Workflows & API Integrity', () => {
  test('Flujo Comercial: Crear Orden de Fabricación', async ({ page }) => {
    await page.goto('/');

    // 1. Open the Comercial Panel
    await page.locator('.status-card', { hasText: 'Comercial' }).click();

    // 2. Find the form for Creating a Manufacturing Order
    const ofCard = page.locator('.admin-detail', { has: page.locator('h3', { hasText: 'Nueva Orden de Fabricación' }) });
    
    // 3. Fill in the form fields
    await ofCard.locator('input[placeholder*="Nombre del cliente"]').fill('Test Cliente Playwright');
    await ofCard.locator('textarea[placeholder*="Detalle"]').fill('Test Descripcion Playwright');
    await ofCard.locator('input[placeholder="Valor"]').fill('15');
    await ofCard.locator('input[placeholder="Monto"]').fill('100000');

    // 4. Intercept the API request to validate payload structure
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/v1/comercial/ordenes-fabricacion') && req.method() === 'POST');
    
    await ofCard.locator('button', { hasText: 'CREAR ORDEN DE FABRICACIÓN' }).click();
    // Modal confirm
    await page.locator('.modal-overlay button.submit-btn').click();
    
    const request = await requestPromise;
    const postData = request.postDataJSON();
    
    // Verify the generated payload perfectly matches the schema requirements
    expect(postData).toMatchObject({
      cliente: 'Test Cliente Playwright',
      descripcion: 'Test Descripcion Playwright',
      plazo_entrega: '15 dias',
      monto_anticipo: 100000
    });
  });

  test('Flujo Administracion: Validar Anticipo con Variables Dinámicas', async ({ page }) => {
    await page.goto('/');

    // 1. Open the Administracion Panel
    await page.locator('.status-card', { hasText: 'Administracion' }).click();

    // 2. Click the newly created order
    await page.locator('.admin-of-card', { hasText: 'Test Cliente Playwright' }).first().click();

    // 3. Fill in the form
    const form = page.locator('form.admin-form');
    await form.locator('.toggle').click();
    await form.locator('textarea').fill('Pago verificado e2e');
    
    // 4. Ensure the React state interpolated the path parameter into the URL correctly
    const requestPromise = page.waitForRequest(req => 
      req.url().includes('/api/v1/administracion/anticipos/') && req.method() === 'PUT'
    );
    
    await form.locator('button[type="submit"]').click();
    
    const request = await requestPromise;
    const postData = request.postData(); // FormData
    
    // Validate boolean type logic was sent correctly in FormData
    expect(postData).toContain('name="pagado"');
    expect(postData).toContain('true');
  });
});
