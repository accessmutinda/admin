import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManagementStore, MODULES } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
import { MatSelectModule } from '@angular/material/select';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementRole } from '../../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
@Component({
  selector: 'cv-users-access',
  imports: [MatSelectModule, CvSelect, ManagementRole, A11yModule, FormsModule],
  host: { '(document:keydown.escape)': 'modal.set(false)' },
  templateUrl: './users-access.html',
})
export class UsersAccess {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly tab = signal('Users');
  protected readonly search = signal('');
  protected readonly modal = signal(false);
  protected readonly compact = toSignal(inject(BreakpointObserver).observe('(max-width: 767px)'));
  protected readonly roles = [
    'Company Admin',
    'Registered Manager',
    'Care Coordinator',
    'Care Worker',
    'HR Officer',
    'Training Manager',
    'Compliance Officer',
    'Finance Officer',
  ];
  protected readonly modules = MODULES;
  protected readonly roleDescriptions: Record<string, string> = {
    'Company Admin': 'Company setup, team access and workspace administration',
    'Registered Manager': 'Care operations, service oversight and team leadership',
    'Care Coordinator': 'Day-to-day scheduling and care coordination',
    'Care Worker': 'Care delivery and assigned person-centred records',
    'HR Officer': 'Recruitment, staff records and employment processes',
    'Training Manager': 'Learning, development and training records',
    'Compliance Officer': 'Quality checks, audits and compliance evidence',
    'Finance Officer': 'Financial records, reporting and invoicing',
  };
  protected readonly moduleIcons: Record<string, string> = {
    'Care delivery': 'favorite',
    'People & HR': 'groups',
    'Training academy': 'school',
    'Quality & compliance': 'verified_user',
    Finance: 'account_balance_wallet',
    'Reports & insights': 'monitoring',
  };
  protected readonly actionDescriptions = [
    'Read records',
    'Add records',
    'Update records',
    'Remove records',
    'Download data',
  ];
  protected readonly actions = ['View', 'Create', 'Edit', 'Delete', 'Export'];
  protected readonly filtered = computed(() =>
    this.store
      .data()
      .members.filter((m) =>
        `${m.name} ${m.email} ${m.role}`.toLowerCase().includes(this.search().toLowerCase()),
      ),
  );
  protected invite = { name: '', email: '', role: 'Care Worker' };
  protected role = 'Registered Manager';
  protected permissions = this.readPermissions();
  private readonly permissionDrafts: Record<string, Record<string, boolean[]>> = {
    [this.role]: this.permissions,
  };
  protected inviteMember(): void {
    this.store.update((d) => ({
      ...d,
      members: [...d.members, { ...this.invite, id: crypto.randomUUID(), status: 'Invited' }],
    }));
    this.modal.set(false);
    this.invite = { name: '', email: '', role: 'Care Worker' };
    this.toast.success('Demo invitation saved. No email has been sent.');
  }
  protected updateRole(id: string, role: string): void {
    this.store.update((d) => ({
      ...d,
      members: d.members.map((m) => (m.id === id ? { ...m, role } : m)),
    }));
    this.toast.success('Role assignment saved.');
  }
  protected readPermissions(): Record<string, boolean[]> {
    return Object.fromEntries(
      MODULES.map((m) => [
        m,
        [
          ...(this.store.data().permissions[this.role + ':' + m] ?? [
            true,
            true,
            true,
            false,
            true,
          ]),
        ],
      ]),
    );
  }
  protected changeRole(): void {
    this.permissions = this.permissionDrafts[this.role] ?? this.readPermissions();
    this.permissionDrafts[this.role] = this.permissions;
  }
  protected permissionCount(): number {
    return Object.values(this.permissions).flat().filter(Boolean).length;
  }
  protected permissionsChanged(): boolean {
    return JSON.stringify(this.permissions) !== JSON.stringify(this.readPermissions());
  }
  protected applyPermissionPreset(preset: 'view' | 'standard' | 'none'): void {
    const values =
      preset === 'view'
        ? [true, false, false, false, false]
        : preset === 'standard'
          ? [true, true, true, false, true]
          : [false, false, false, false, false];
    this.permissions = Object.fromEntries(MODULES.map((m) => [m, [...values]]));
    this.permissionDrafts[this.role] = this.permissions;
  }
  protected discardPermissions(): void {
    this.permissions = this.readPermissions();
    this.permissionDrafts[this.role] = this.permissions;
  }
  protected savePermissions(): void {
    this.store.update((d) => ({
      ...d,
      permissions: {
        ...d.permissions,
        ...Object.fromEntries(MODULES.map((m) => [this.role + ':' + m, [...this.permissions[m]]])),
      },
    }));
    this.toast.success('Permission configuration saved.');
  }
}
