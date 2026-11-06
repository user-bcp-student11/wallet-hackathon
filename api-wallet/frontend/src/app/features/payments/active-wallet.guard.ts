import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingStore } from '../onboarding/onboarding.store';

/** El punto de entrada de pagos solo está disponible con una wallet ACTIVE; si no, vuelve al registro. */
export const activeWalletGuard: CanActivateFn = () => {
  const wallet = inject(OnboardingStore).wallet();
  return wallet?.status === 'ACTIVE' ? true : inject(Router).createUrlTree(['/registro']);
};
