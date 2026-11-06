import { Routes } from '@angular/router';
import { paymentsAccessGuard } from './core/guards/payments-access.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'onboarding' },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'pagos',
    canActivate: [paymentsAccessGuard],
    loadComponent: () => import('./features/payments/payments.page').then((m) => m.PaymentsPage),
  },
  { path: '**', redirectTo: 'onboarding' },
];
