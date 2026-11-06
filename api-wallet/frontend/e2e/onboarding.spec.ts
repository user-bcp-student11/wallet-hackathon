import { Page, expect, test } from '@playwright/test';

/**
 * E2E del registro W1 en viewport móvil. El backend se simula con `page.route`
 * siguiendo el contrato `openapi-wallet.yml`, así la prueba no necesita PostgreSQL.
 */
async function mockBackend(page: Page, options: { failFirstCreate?: boolean } = {}) {
  let createCalls = 0;
  await page.route('**/kyc/verifications', async (route) => {
    createCalls++;
    const body = route.request().postDataJSON() as { documentType: string; document: string; scenario?: string };
    expect(body.documentType).toBe('TEST');
    expect(body.document.startsWith('TEST-')).toBe(true);
    if (body.scenario === 'UNAVAILABLE' || (options.failFirstCreate && createCalls === 1)) {
      await route.fulfill({ status: 503, json: { error: 'KYC_UNAVAILABLE' } });
      return;
    }
    await route.fulfill({
      status: 201,
      json: { id: `kyc-${createCalls}`, wallet_id: `wallet-${createCalls}`, scenario: 'APPROVED', status: 'ACTIVE' },
    });
  });
  await page.route('**/wallets/*', (route) => {
    const id = route.request().url().split('/').pop();
    return route.fulfill({
      json: { id, status: 'ACTIVE', balance: 0, reserved: 0, available: 0, currency: 'PEN' },
    });
  });
}

test('registro aprobado deja la wallet activa', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByRole('heading', { name: 'Crea tu wallet' })).toBeVisible();

  await page.getByLabel('Número de documento').fill('TEST-001');
  await page.getByLabel('Resultado a simular').selectOption('APPROVED');
  await page.getByRole('button', { name: 'Crear mi wallet' }).click();

  const heading = page.getByRole('heading', { name: 'Tu wallet está activa' });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.getByTestId('wallet-status')).toHaveText('Activa');
});

test('error recuperable: el proveedor no disponible permite reintentar', async ({ page }) => {
  await mockBackend(page, { failFirstCreate: true });
  await page.goto('/registro');

  await page.getByLabel('Número de documento').fill('TEST-002');
  await page.getByRole('button', { name: 'Crear mi wallet' }).click();

  const alert = page.getByTestId('server-error');
  await expect(alert).toContainText('El servicio de verificación no está disponible');
  await expect(page.getByLabel('Número de documento')).toHaveValue('TEST-002');

  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu wallet está activa' })).toBeVisible();
});

test('entrada inválida bloquea el envío y enfoca el campo', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/registro');

  const input = page.getByLabel('Número de documento');
  await input.fill('12345678');
  await page.getByRole('button', { name: 'Crear mi wallet' }).click();

  await expect(page.getByText('El documento debe empezar con TEST-.')).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
});

test('los objetivos táctiles miden al menos 44 px', async ({ page }) => {
  await page.goto('/registro');
  for (const locator of [
    page.getByRole('button', { name: 'Crear mi wallet' }),
    page.getByLabel('Número de documento'),
    page.getByLabel('Resultado a simular'),
  ]) {
    const box = await locator.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
