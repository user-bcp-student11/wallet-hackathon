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

async function completeData(page: Page, document: string) {
  await page.getByLabel('Número de documento').fill(document);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('registro aprobado: muestra los pasos, activa la wallet y da acceso a pagos', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/?channel=facebook&campaign=mvp');

  await page.getByRole('link', { name: 'Regístrate' }).click();
  await expect(page).toHaveURL(/\/registro$/);
  const progress = page.getByTestId('step-count');
  await expect(progress).toContainText('Paso 1 de 3');

  await completeData(page, 'TEST-001');
  await expect(progress).toContainText('Paso 2 de 3');

  await page.getByLabel('Resultado a simular').selectOption('APPROVED');
  await page.getByRole('button', { name: 'Verificar identidad' }).click();

  const heading = page.getByRole('heading', { name: 'Tu wallet está activa' });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(progress).toContainText('Paso 3 de 3');
  await expect(page.getByTestId('wallet-status')).toHaveText('Activa');

  await page.getByRole('link', { name: 'Ir a pagos' }).click();
  await expect(page).toHaveURL(/\/pagos$/);
  await expect(page.getByRole('heading', { name: 'Paga y transfiere' })).toBeVisible();
});

test('error recuperable: el proveedor no disponible permite reintentar', async ({ page }) => {
  await mockBackend(page, { failFirstCreate: true });
  await page.goto('/registro');

  await completeData(page, 'TEST-002');
  await page.getByRole('button', { name: 'Verificar identidad' }).click();

  const alert = page.getByTestId('server-error');
  await expect(alert).toContainText('El servicio de verificación no está disponible');

  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu wallet está activa' })).toBeVisible();
});

test('entrada inválida bloquea el avance y enfoca el campo', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/registro');

  const input = page.getByLabel('Número de documento');
  await completeData(page, '12345678');

  await expect(page.getByText('El documento debe empezar con TEST-. Corrígelo para continuar.')).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('step-count')).toContainText('Paso 1 de 3');
});

test('pagos no es accesible sin una wallet activa', async ({ page }) => {
  await page.goto('/pagos');
  await expect(page).toHaveURL(/\/registro$/);
});

test('los objetivos táctiles miden al menos 44 px', async ({ page }) => {
  await page.goto('/registro');
  for (const locator of [
    page.getByRole('button', { name: 'Continuar' }),
    page.getByLabel('Número de documento'),
    page.getByLabel('Tipo de documento'),
    page.getByRole('link', { name: 'Volver al inicio' }),
  ]) {
    const box = await locator.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
