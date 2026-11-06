import { Pipe, PipeTransform } from '@angular/core';

const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

/** Formatea un importe en céntimos de PEN, por ejemplo 100000 → "S/ 1,000.00". */
export function formatPenCents(cents: number): string {
  return PEN.format(cents / 100);
}

@Pipe({ name: 'penCents' })
export class PenCentsPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return cents == null ? '' : formatPenCents(cents);
  }
}
