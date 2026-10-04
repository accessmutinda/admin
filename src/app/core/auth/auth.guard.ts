import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Blocks access unless a session exists. Signed-out users are sent to sign-in. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/sign-in'], { queryParams: { redirectTo: state.url } });
};

/** Blocks access to signed-in-only auth screens (sign-in, invite, etc.) once a session exists. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/select-workspace']);
};

/** Requires a session AND a chosen workspace — for screens inside the app shell. */
export const workspaceGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/sign-in']);
  }
  if (auth.needsWorkspace()) {
    return router.createUrlTree(['/select-workspace']);
  }
  return true;
};
