import { InjectionToken } from '@angular/core';

/**
 * Base de la API. Vacía por defecto: en desarrollo las rutas `/kyc` y `/wallets`
 * pasan por el proxy de `ng serve` (`proxy.conf.json`) hacia el backend en el puerto 8787.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});
