import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'registro' },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/registration/registration.page').then((m) => m.RegistrationPage),
  },
  { path: '**', redirectTo: 'registro' },
];
