import { expect, test } from '@playwright/test';
import { MockBackend } from './mock-backend';

test.beforeEach(async ({ page }) => {
  await new MockBackend(page).install();
  await page.goto('/');
});

test('recorrido completo hasta la wallet activa en móvil', async ({ page }) => {
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await page.getByLabel('Celular').fill('912345678');
  await page.getByLabel('Código de verificación').fill('123456');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await page.getByLabel('Número de documento').fill('12345678');
  await page.getByLabel('Nombres').fill('Ana');
  await page.getByLabel('Apellidos').fill('Quispe');
  await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  await page.getByLabel('Acepto los términos y condiciones').check();
  await page.getByRole('button', { name: 'Finalizar registro' }).click();

  await expect(page.getByRole('heading', { name: '¡Tu wallet está activa!' })).toBeVisible();
  await page.getByRole('link', { name: 'Ir a pagar' }).click();
  await expect(page.getByRole('heading', { name: 'Pagos' })).toBeVisible();
});

test('error de validación recuperable conservando lo ingresado', async ({ page }) => {
  await page.getByLabel('Celular').fill('912345678');
  await page.getByLabel('Código de verificación').fill('000000');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('El código es incorrecto. Revísalo e inténtalo de nuevo.')).toBeVisible();
  await expect(page.getByLabel('Código de verificación')).toBeFocused();
  await expect(page.getByLabel('Celular')).toHaveValue('912345678');

  await page.getByLabel('Código de verificación').fill('123456');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
});

test('la validación local bloquea el avance y señala el campo', async ({ page }) => {
  await page.getByLabel('Celular').fill('812345678');
  await page.getByLabel('Código de verificación').fill('123456');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('El celular debe empezar con 9.')).toBeVisible();
  await expect(page.getByLabel('Celular')).toBeFocused();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
});
