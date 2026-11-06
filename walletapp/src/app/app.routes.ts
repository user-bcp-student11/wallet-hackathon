import { Routes } from '@angular/router';

/** Rutas públicas (sin protección por ahora): landing y activación de la wallet. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Al toque',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'activacion',
    title: 'Activa tu wallet · Al toque',
    loadComponent: () => import('./features/activation/activation').then((m) => m.Activation),
  },
  { path: '**', redirectTo: '' },
];
