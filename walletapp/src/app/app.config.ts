import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Al navegar entre pantallas se vuelve al inicio de la página (útil con scroll en móvil).
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
  ],
};
