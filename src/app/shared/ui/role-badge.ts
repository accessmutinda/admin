import { Component, computed, input } from '@angular/core';
import { ROLES, RoleCode } from '../../core/auth/models/role';

@Component({
  selector: 'cv-role-badge',
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm {{
        role().colorClass
      }}"
    >
      {{ role().label }}
    </span>
  `,
})
export class RoleBadge {
  readonly code = input.required<RoleCode>();
  protected readonly role = computed(() => ROLES[this.code()]);
}
