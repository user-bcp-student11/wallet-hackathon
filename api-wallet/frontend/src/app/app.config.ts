import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { AttributionStore } from './core/analytics/attribution';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch()),
    // Atribución de adquisición (channel, campaign, ref) desde la URL de entrada.
    provideAppInitializer(() => inject(AttributionStore).capture(globalThis.location?.search ?? '')),
  ],
};
