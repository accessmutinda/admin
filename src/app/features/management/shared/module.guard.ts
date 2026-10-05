import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { ManagementStore } from './management.store';
import { ToastService } from '../../../shared/ui/toast.service';

export const moduleGuard = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const module = route.data['module'] as string | undefined;
  const store = inject(ManagementStore);
  const router = inject(Router);
  const toast = inject(ToastService);
  if (!module || store.company()?.modules.includes(module)) return true;
  toast.info(`${module} is not enabled for this company. Update its module settings to continue.`);
  return router.createUrlTree(['/manage/companies']);
};
