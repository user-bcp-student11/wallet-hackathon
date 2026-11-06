import { Routes } from '@angular/router';
import { activeWalletGuard } from './features/payments/active-wallet.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Al toque · Tu wallet',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'registro',
    title: 'Al toque · Activa tu wallet',
    loadComponent: () => import('./features/onboarding/registration.page').then((m) => m.RegistrationPage),
  },
  {
    path: 'pagos',
    title: 'Al toque · Pagos',
    canActivate: [activeWalletGuard],
    loadComponent: () => import('./features/payments/payments.page').then((m) => m.PaymentsPage),
  },
  { path: '**', redirectTo: '' },
];
