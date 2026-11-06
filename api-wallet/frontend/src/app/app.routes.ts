import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'registro' },
  {
    path: 'registro',
    title: 'Crea tu wallet',
    loadComponent: () => import('./features/onboarding/registration.page').then((m) => m.RegistrationPage),
  },
  { path: '**', redirectTo: 'registro' },
];
