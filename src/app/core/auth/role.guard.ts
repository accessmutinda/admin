import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROLES, RoleCode } from './models/role';

/** Factory for a guard that requires the signed-in user to hold one of the given roles. */
export function roleGuard(...codes: RoleCode[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(...codes)) {
      return true;
    }

    router.navigate(['/access-denied'], {
      state: { requiredRoleLabels: codes.map((code) => ROLES[code].label) },
    });
    return false;
  };
}
