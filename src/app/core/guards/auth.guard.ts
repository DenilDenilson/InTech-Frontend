import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { getSafeReturnUrl } from '../../shared/utils/safe-return-url';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: getSafeReturnUrl(state.url) },
  });
};
