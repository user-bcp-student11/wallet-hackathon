import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { WalletApi } from '../api/wallet.api';

export const paymentsAccessGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(WalletApi)
    .paymentsAccess()
    .pipe(
      map((access) => access.enabled || router.createUrlTree(['/onboarding'])),
      catchError(() => of(router.createUrlTree(['/onboarding']))),
    );
};
