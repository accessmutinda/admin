import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CompanyAccessService } from '../../../core/access/company-access.service';

export const moduleGuard = async (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const access = inject(CompanyAccessService);
  const router = inject(Router);
  await access.refreshForNavigation();
  return access.canPath(state.url) || router.createUrlTree(['/access-denied']);
};
