import { AuthService } from '../../core/auth/auth.service';
import { workspaceGuard } from '../../core/auth/auth.guard';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { inspectorEntryPath } from '../../core/access/inspector-routes';

export const inspectorEntryGuard: CanActivateFn = () => {
  const access = inject(CompanyAccessService);
  return inject(Router).parseUrl(
    inspectorEntryPath((path) => access.canPath(path)) ?? '/access-denied',
  );
};

export const inspectorWorkspaceGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService),
    router = inject(Router);
  if (auth.isAuthenticated() && auth.isSuperAdmin() && !auth.session()?.workspaceId)
    return router.parseUrl(auth.canSwitchWorkspace() ? '/select-workspace' : '/access-denied');
  return workspaceGuard(route, state);
};
