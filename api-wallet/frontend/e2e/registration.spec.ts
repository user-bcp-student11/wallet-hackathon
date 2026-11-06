import { expect, test } from '@playwright/test';
import { MockBackend } from './mock-backend';

test.beforeEach(async ({ page }) => {
  await new MockBackend(page).install();
  await page.goto('/');
});

test('registro aprobado muestra la wallet activa en móvil', async ({ page }) => {
  await page.getByLabel('Documento', { exact: true }).fill('TEST-001');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByRole('heading', { name: '¡Tu wallet está activa!' })).toBeVisible();
  await expect(page.getByText('Saldo disponible')).toBeVisible();
});

test('revisión manual explica que falta una decisión', async ({ page }) => {
  await page.getByLabel('Documento', { exact: true }).fill('TEST-002');
  await page.getByLabel('Escenario de verificación').selectOption('MANUAL_REVIEW');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByRole('heading', { name: 'Tu registro está en revisión' })).toBeVisible();
  await expect(page.getByText('Falta una decisión', { exact: false })).toBeVisible();
});

test('error recuperable: proveedor no disponible conserva lo ingresado', async ({ page }) => {
  await page.getByLabel('Documento', { exact: true }).fill('TEST-003');
  await page.getByLabel('Escenario de verificación').selectOption('UNAVAILABLE');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'El servicio de verificación no está disponible. Inténtalo de nuevo en unos minutos.',
  );
  await expect(page.getByLabel('Documento', { exact: true })).toHaveValue('TEST-003');

  await page.getByLabel('Escenario de verificación').selectOption('APPROVED');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByRole('heading', { name: '¡Tu wallet está activa!' })).toBeVisible();
});

test('la validación local bloquea el envío y enfoca el campo', async ({ page }) => {
  await page.getByLabel('Documento', { exact: true }).fill('12345678');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByText('El documento debe empezar con TEST-.')).toBeVisible();
  await expect(page.getByLabel('Documento', { exact: true })).toBeFocused();
});
