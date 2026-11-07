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
  return auth.canSwitchWorkspace() || inject(Router).parseUrl(auth.nextRoute());
};

export const workspaceGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.parseUrl(auth.nextRoute());
  const me = auth.profile();
  if (auth.isSuperAdmin()) return true;
  if (me?.company_entry_state === 'ready' && me.company_id) return true;
  return router.parseUrl('/access-denied');
};

export const managementAccessGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.parseUrl(auth.nextRoute());
  const path = state.url.split(/[?#]/)[0].replace(/\/$/, '');
  if (auth.isSuperAdmin()) {
    const requestedCompany = route.routeConfig?.path?.startsWith('companies/:id')
      ? route.paramMap.get('id')
      : null;
    if (requestedCompany && requestedCompany !== auth.session()?.workspaceId) {
      return auth
        .selectWorkspace(requestedCompany)
        .then(() => true)
        .catch(() => router.parseUrl('/access-denied'));
    }
    if (!auth.session()?.workspaceId && !path.startsWith('/manage/companies'))
      return router.parseUrl('/select-workspace');
    return true;
  }
  const companyId = auth.profile()?.company_id;
  if (!companyId || auth.profile()?.company_entry_state !== 'ready')
    return router.parseUrl('/access-denied');
  if (path === '/manage/companies') return router.createUrlTree(['/manage/companies', companyId]);
  if (path === '/manage/companies/new' || path === '/manage/companies/directory')
    return router.parseUrl('/access-denied');
  if (
    route.routeConfig?.path?.startsWith('companies/:id') &&
    !auth.canAccessCompany(route.paramMap.get('id') ?? '')
  )
    return router.parseUrl('/access-denied');
  return true;
};
