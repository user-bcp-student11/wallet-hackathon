import { FormGroup } from '@angular/forms';

/**
 * Lleva el foco al primer control inválido, en el orden en que se declararon en el formulario.
 * El `id` del elemento debe coincidir con el nombre del control.
 * Devuelve `true` si encontró un control inválido.
 */
export function focusFirstInvalid(form: FormGroup, host: HTMLElement): boolean {
  const name = Object.keys(form.controls).find((key) => form.controls[key].invalid);
  if (!name) return false;
  host.querySelector<HTMLElement>(`#${name}`)?.focus();
  return true;
}
