import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementStore } from './management.store';

@Component({
  selector: 'cv-access-required',
  imports: [RouterLink],
  template: `
    <section
      class="panel access-required-panel"
      [attr.aria-labelledby]="feature() + '-access-heading'"
    >
      <span class="access-required-icon material-symbols-outlined" aria-hidden="true"
        >lock_person</span
      >
      <div class="access-required-content">
        <h2 [id]="feature() + '-access-heading'">{{ feature() }} access required</h2>
        <p>Your current role does not have access to this module in {{ store.company()?.name }}.</p>
        <div class="access-required-context">
          <span class="badge">{{ role() }}</span
          ><span>{{ module() }} module</span>
        </div>
        <div class="access-required-help">
          <span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
          <p>
            An administrator can enable <strong>{{ viewPermission() }}</strong> in
            <strong>Users & access → Permissions → {{ permissionsTitle() }}</strong
            >, alongside {{ module() }} permissions.
          </p>
        </div>
        <div class="row access-required-actions">
          <a
            class="button primary"
            routerLink="/manage/access"
            [queryParams]="{ tab: 'permissions', role: role() }"
            ><span class="material-symbols-outlined" aria-hidden="true">manage_accounts</span>Review
            role permissions</a
          ><a class="button" routerLink="/manage/companies">Back to workspace</a>
        </div>
      </div>
    </section>
  `,
})
export class AccessRequired {
  readonly feature = input.required<string>();
  readonly module = input.required<string>();
  readonly viewPermission = input.required<string>();
  readonly permissionsTitle = input.required<string>();
  protected readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  protected readonly role = computed(() => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label);
}
