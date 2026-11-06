import { Injectable, signal } from '@angular/core';

/**
 * Atribución de adquisición (para medir CAC por canal y campaña).
 * Se toma de la URL de entrada: `?channel=…&campaign=…&ref=…`.
 */
export interface Attribution {
  channel: string | null;
  campaign: string | null;
  ref: string | null;
}

const KEYS = ['channel', 'campaign', 'ref'] as const;
const SAFE_VALUE = /^[A-Za-z0-9._-]{1,64}$/;

/** Solo acepta identificadores cortos de campaña; descarta cualquier otro valor (p. ej. datos personales). */
export function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const read = (key: string) => {
    const value = params.get(key);
    return value && SAFE_VALUE.test(value) ? value : null;
  };
  return { channel: read('channel'), campaign: read('campaign'), ref: read('ref') };
}

/** Guarda en memoria la atribución de la URL de entrada; nunca en el almacenamiento del navegador. */
@Injectable({ providedIn: 'root' })
export class AttributionStore {
  readonly value = signal<Attribution>({ channel: null, campaign: null, ref: null });

  /** Captura la atribución una sola vez, desde la primera URL que trae alguno de los parámetros. */
  capture(search: string): void {
    if (KEYS.some((key) => this.value()[key] !== null)) return;
    this.value.set(parseAttribution(search));
  }
}
