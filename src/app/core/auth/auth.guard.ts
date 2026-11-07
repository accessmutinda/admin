import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated() && auth.state() !== 'signed_out')
    return router.parseUrl(auth.nextRoute());
  return (
    auth.isAuthenticated() ||
    router.createUrlTree(['/auth/sign-in'], { queryParams: { redirectTo: state.url } })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isAuthenticated() || inject(Router).parseUrl(auth.nextRoute());
};

export const passwordChangeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.state() === 'password_change_required' || inject(Router).parseUrl(auth.nextRoute());
};

export const workspaceSelectionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return (
    (auth.isAuthenticated() && auth.profile()?.can_select_workspace) ||
    inject(Router).parseUrl(auth.nextRoute())
  );
};

export const workspaceGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.parseUrl(auth.nextRoute());
  const me = auth.profile();
  if (me?.company_entry_state === 'platform') return true;
  if (me?.company_entry_state === 'ready' && me.company_id) return true;
  return router.parseUrl('/access-denied');
};
