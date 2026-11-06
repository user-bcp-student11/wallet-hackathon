import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { idempotencyKeyInterceptor } from './core/http/idempotency-key.interceptor';
import { userIdInterceptor } from './core/http/user-id.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([userIdInterceptor, idempotencyKeyInterceptor])),
  ],
};
