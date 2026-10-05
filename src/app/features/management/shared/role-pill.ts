import { Component, computed, input } from '@angular/core';
import { ROLES, RoleCode } from '../../../core/auth/models/role';

@Component({
  selector: 'cv-management-role',
  template: `<span class="role-pill" [attr.data-role]="code()"
    ><span class="role-code" aria-hidden="true" [attr.data-code]="code()"></span>{{ label() }}</span
  >`,
})
export class ManagementRole {
  readonly label = input.required<string>();
  protected readonly code = computed(() => {
    const match = (Object.keys(ROLES) as RoleCode[]).find(
      (code) => ROLES[code].label === this.label(),
    );
    return (
      match ??
      this.label()
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
    );
  });
}
