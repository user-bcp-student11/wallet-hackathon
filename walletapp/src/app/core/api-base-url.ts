import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** URL base de la API, sin barra final. Se define por ambiente en `src/environments`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => environment.apiBaseUrl.replace(/\/+$/, ''),
});
