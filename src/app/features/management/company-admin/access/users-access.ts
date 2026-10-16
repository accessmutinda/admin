import { PAYROLL_ACTIONS, payrollDefaults, PayrollAction } from '../../payroll/payroll.models';
import { ROTA_ACTIONS, rotaDefaults, RotaAction } from '../../rota/rota.models';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyUserDialog } from '../../companies/company-user-dialog';
import { companyModifiedAt } from '../../companies/company-profile.models';
import { Member } from '../../shared/management.store';
import { accessChange, accessCsv, rolePermissions, permissionLevel } from './access.models';
import {
  Component,
  computed,
  inject,
  signal,
  effect,
  untracked,
  HostListener,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManagementStore, MODULES } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
import { MatSelectModule } from '@angular/material/select';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementRole } from '../../shared/role-pill';
@Component({
  selector: 'cv-users-access',
  imports: [
    MatSelectModule,
    CvSelect,
    ManagementRole,
    FormsModule,
    RouterLink,
    MatDialogModule,
    MatMenuModule,
  ],
  host: { class: 'companies-page users-access-page' },
  templateUrl: './users-access.html',
})
export class UsersAccess {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private draftCompanyId = this.store.companyId();
  private closeDialog?: () => void;
  protected readonly company = this.store.company;
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly error = signal('');
  protected readonly pageSize = 5;
  protected readonly page = signal(1);
  protected readonly selection = signal<string[]>([]);
  protected readonly statusFilter = signal('all');
  protected readonly roleFilter = signal('all');
  protected readonly history = computed(() =>
    [...(this.store.data().accessHistory ?? [])].reverse().sort((a, b) => b.at.localeCompare(a.at)),
  );
  protected readonly search = signal('');
  protected readonly compact = toSignal(inject(BreakpointObserver).observe('(max-width: 767px)'));
  protected readonly roles = [
    'Company Admin',
    'Registered Manager',
    'Care Coordinator',
    'Field Supervisor',
    'Quality Assurance',
    'Care Worker',
    'HR Officer',
    'Training Manager',
    'Compliance Officer',
    'Finance Officer',
  ];
  protected readonly modules = MODULES;
  protected readonly moduleColors = [
    '#008afa',
    '#00a34e',
    '#ff8a00',
    '#7c3aed',
    '#03a6c1',
    '#ed3988',
  ];
  protected readonly roleDescriptions: Record<string, string> = {
    'Company Admin': 'Company setup, team access and workspace administration',
    'Registered Manager': 'Care operations, service oversight and team leadership',
    'Care Coordinator': 'Day-to-day scheduling and care coordination',
    'Field Supervisor': 'Care visits, staff supervision and field oversight',
    'Quality Assurance': 'Quality assessments, service reviews and corrective actions',
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
      .members.filter(
        (member) =>
          `${member.name} ${member.email} ${member.role} ${member.department ?? ''}`
            .toLowerCase()
            .includes(this.search().trim().toLowerCase()) &&
          (this.statusFilter() === 'all' || member.status === this.statusFilter()) &&
          (this.roleFilter() === 'all' || member.role === this.roleFilter()),
      ),
  );
  protected readonly memberRoles = computed(() => [
    ...new Set([...this.roles, ...this.store.data().members.map((member) => member.role)]),
  ]);
  protected readonly statuses = computed(() => [
    ...new Set([
      'Active',
      'Invited',
      'Suspended',
      'Inactive',
      ...this.store.data().members.map((member) => member.status),
    ]),
  ]);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() =>
    Math.max(1, Math.min(this.page(), this.pageCount())),
  );
  protected readonly rows = computed(() =>
    this.filtered().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  protected readonly start = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0,
  );
  protected readonly end = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filtered().length),
  );
  protected readonly allSelected = computed(
    () =>
      !!this.rows().length && this.rows().every((member) => this.selection().includes(member.id)),
  );
  protected readonly someSelected = computed(
    () => !this.allSelected() && this.rows().some((member) => this.selection().includes(member.id)),
  );
  protected role = 'Registered Manager';
  protected permissions = this.readPermissions();
  private readonly permissionDrafts: Record<string, Record<string, boolean[]>> = {
    [this.role]: this.permissions,
  };
  protected setFilter(key: 'search' | 'statusFilter' | 'roleFilter', value: string): void {
    this[key].set(value);
    this.page.set(1);
    this.selection.set([]);
  }
  protected toggleMember(id: string): void {
    this.selection.update((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }
  protected togglePage(): void {
    const visible = new Set(this.rows().map((member) => member.id));
    this.selection.update((ids) =>
      this.allSelected()
        ? ids.filter((id) => !visible.has(id))
        : [...new Set([...ids, ...visible])],
    );
  }
  protected level(role: string, module?: string) {
    if (module) return permissionLevel(rolePermissions(this.store.data(), role, module));
    const levels = this.modules
      .filter((name) => this.company()?.modules.includes(name))
      .map((name) => permissionLevel(rolePermissions(this.store.data(), role, name)));
    if (!levels.length || levels.every((value) => value.tone === 'none'))
      return permissionLevel([]);
    if (levels.every((value) => value.tone === 'full'))
      return permissionLevel([true, true, true, true, true]);
    if (levels.every((value) => value.tone === 'view'))
      return permissionLevel([true, false, false, false, false]);
    return permissionLevel([true, true, false, false, false]);
  }
  protected openMember(
    mode: 'invite' | 'edit' | 'delete',
    member?: Member,
    initialRole?: string,
  ): void {
    if (!this.company()) return;
    const ref = this.dialog.open(CompanyUserDialog, {
      width: '440px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        companyId: this.store.companyId(),
        mode,
        initialRole,
        member: member ? structuredClone(member) : undefined,
      },
    });
    this.closeDialog = () => ref.close();
  }
  protected exportUsers(): void {
    const members = this.filtered().filter(
      (member) => !this.selection().length || this.selection().includes(member.id),
    );
    this.store.download(
      'company-users.csv',
      accessCsv([
        ['Name', 'Email', 'Role', 'Department', 'Access', 'Status', 'Last login', 'MFA'],
        ...members.map((member) => [
          member.name,
          member.email,
          member.role,
          member.department ?? '',
          this.level(member.role).label,
          member.status,
          member.lastLoginAt ?? '',
          member.mfaEnabled === undefined
            ? 'Not recorded'
            : member.mfaEnabled
              ? 'Enabled'
              : 'Disabled',
        ]),
      ]),
    );
  }
  protected exportHistory(): void {
    this.store.download(
      'company-access-history.csv',
      accessCsv([
        ['Date', 'Changed by', 'Action', 'Subject', 'Details'],
        ...this.history().map((change) => [
          change.at,
          change.actor,
          change.action,
          change.subject,
          change.detail,
        ]),
      ]),
    );
  }
  protected readPermissions(): Record<string, boolean[]> {
    return Object.fromEntries(
      MODULES.map((module) => [module, rolePermissions(this.store.data(), this.role, module)]),
    );
  }
  protected readonly payrollActions = PAYROLL_ACTIONS;
  protected readonly payrollActionDescriptions: Record<PayrollAction, string> = {
    view: 'Read pay runs, overtime and invoices',
    manage: 'Maintain staff pay, work records and invoices',
    approve: 'Review overtime and contractor invoices',
    finalise: 'Lock approved pay runs for payment',
    export: 'Download payroll reports and payment files',
    pay: 'Record pay-run and invoice payments',
  };
  protected payrollAccess: PayrollAction[] = this.readPayrollAccess();
  protected readonly rotaActions = ROTA_ACTIONS;
  protected rotaAccess: RotaAction[] = this.readRotaAccess();
  private readonly rotaDrafts: Record<string, RotaAction[]> = {};
  private readRotaAccess(): RotaAction[] {
    return [...(this.store.data().rotaPermissions?.[this.role] ?? rotaDefaults(this.role))];
  }
  protected hasRotaAction(action: RotaAction): boolean {
    return this.rotaAccess.includes(action);
  }
  protected toggleRotaAction(action: RotaAction): void {
    this.rotaAccess = this.rotaAccess.includes(action)
      ? this.rotaAccess.filter((a) => a !== action)
      : [...this.rotaAccess, action];
    this.rotaDrafts[this.role] = this.rotaAccess;
  }
  constructor() {
    effect(() => {
      const ids = new Set(this.store.data().members.map((member) => member.id));
      untracked(() => this.selection.update((selected) => selected.filter((id) => ids.has(id))));
    });
    effect(() => {
      const id = this.store.companyId();
      if (id === this.draftCompanyId) return;
      untracked(() => {
        this.draftCompanyId = id;
        this.closeDialog?.();
        this.closeDialog = undefined;
        for (const drafts of [this.permissionDrafts, this.rotaDrafts, this.payrollDrafts])
          for (const key of Object.keys(drafts)) delete drafts[key];
        this.role = 'Registered Manager';
        this.changeRole();
        this.search.set('');
        this.statusFilter.set('all');
        this.roleFilter.set('all');
        this.selection.set([]);
        this.page.set(1);
        this.error.set('');
      });
    });
    let inviteRequested = false;
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => {
        const invite = params.get('invite') === 'true';
        if (invite && !inviteRequested) {
          const companyId = this.store.companyId();
          queueMicrotask(() => {
            if (!this.destroy.destroyed && companyId === this.store.companyId())
              this.openMember('invite', undefined, 'Company Admin');
          });
        }
        inviteRequested = invite;
        if (params.get('tab') === 'permissions') {
          const role = params.get('role');
          if (role && this.roles.includes(role)) {
            this.role = role;
            this.changeRole();
          }
        }
      });
  }

  private readonly payrollDrafts: Record<string, PayrollAction[]> = {};
  private readPayrollAccess(): PayrollAction[] {
    return [...(this.store.data().payrollPermissions?.[this.role] ?? payrollDefaults(this.role))];
  }
  protected hasPayrollAction(action: PayrollAction): boolean {
    return this.payrollAccess.includes(action);
  }
  protected togglePayrollAction(action: PayrollAction): void {
    this.payrollAccess = this.payrollAccess.includes(action)
      ? this.payrollAccess.filter((a) => a !== action)
      : [...this.payrollAccess, action];
    this.payrollDrafts[this.role] = this.payrollAccess;
  }
  protected changeRole(): void {
    this.permissions = this.permissionDrafts[this.role] ?? this.readPermissions();
    this.payrollAccess = this.payrollDrafts[this.role] ?? this.readPayrollAccess();
    this.rotaAccess = this.rotaDrafts[this.role] ?? this.readRotaAccess();
    this.permissionDrafts[this.role] = this.permissions;
  }
  protected permissionCount(): number {
    return Object.values(this.permissions).flat().filter(Boolean).length;
  }
  protected enabledActions(module: string): number {
    return this.permissions[module].filter(Boolean).length;
  }
  protected permissionsChanged(): boolean {
    return (
      JSON.stringify(this.permissions) !== JSON.stringify(this.readPermissions()) ||
      JSON.stringify([...this.payrollAccess].sort()) !==
        JSON.stringify(this.readPayrollAccess().sort()) ||
      JSON.stringify([...this.rotaAccess].sort()) !== JSON.stringify(this.readRotaAccess().sort())
    );
  }
  protected applyPermissionPreset(preset: 'view' | 'standard' | 'none'): void {
    const values =
      preset === 'view'
        ? [true, false, false, false, false]
        : preset === 'standard'
          ? [true, true, true, false, true]
          : [false, false, false, false, false];
    this.payrollAccess =
      preset === 'none' ? [] : preset === 'view' ? ['view'] : payrollDefaults(this.role);
    this.payrollDrafts[this.role] = this.payrollAccess;
    this.rotaAccess =
      preset === 'none' ? [] : preset === 'view' ? ['view'] : rotaDefaults(this.role);
    this.rotaDrafts[this.role] = this.rotaAccess;
    this.permissions = Object.fromEntries(MODULES.map((m) => [m, [...values]]));
    this.permissionDrafts[this.role] = this.permissions;
  }
  protected discardPermissions(): void {
    this.rotaAccess = this.readRotaAccess();
    this.rotaDrafts[this.role] = this.rotaAccess;
    this.payrollAccess = this.readPayrollAccess();
    this.payrollDrafts[this.role] = this.payrollAccess;
    this.permissions = this.readPermissions();
    this.permissionDrafts[this.role] = this.permissions;
  }
  private hasPermissionDrafts(): boolean {
    return (
      Object.entries(this.permissionDrafts).some(([role, draft]) =>
        this.modules.some(
          (module) =>
            JSON.stringify(draft[module]) !==
            JSON.stringify(rolePermissions(this.store.data(), role, module)),
        ),
      ) ||
      Object.entries(this.rotaDrafts).some(
        ([role, draft]) =>
          JSON.stringify([...draft].sort()) !==
          JSON.stringify(
            [...(this.store.data().rotaPermissions?.[role] ?? rotaDefaults(role))].sort(),
          ),
      ) ||
      Object.entries(this.payrollDrafts).some(
        ([role, draft]) =>
          JSON.stringify([...draft].sort()) !==
          JSON.stringify(
            [...(this.store.data().payrollPermissions?.[role] ?? payrollDefaults(role))].sort(),
          ),
      ) ||
      this.permissionsChanged()
    );
  }
  canLeave(): boolean {
    return (
      !this.hasPermissionDrafts() || window.confirm('Leave without saving role permission changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (this.hasPermissionDrafts()) event.preventDefault();
  }
  protected savePermissions(): void {
    this.error.set('');
    if (this.draftCompanyId !== this.store.companyId()) {
      this.error.set('The workspace changed. Reopen this role before saving.');
      return;
    }
    if (!this.roles.includes(this.role)) {
      this.error.set('Select an existing company role.');
      return;
    }
    if (!this.permissionsChanged()) return;
    const saved = this.store.saveWorkspace((d) => ({
      ...d,
      accessHistory: [
        ...(d.accessHistory ?? []),
        accessChange(
          this.auth.currentUser(),
          'permissions',
          this.role,
          'Module, rota and payroll permission configuration updated',
        ),
      ],
      payrollPermissions: { ...d.payrollPermissions, [this.role]: [...this.payrollAccess] },
      rotaPermissions: { ...d.rotaPermissions, [this.role]: [...this.rotaAccess] },
      permissions: {
        ...d.permissions,
        ...Object.fromEntries(MODULES.map((m) => [this.role + ':' + m, [...this.permissions[m]]])),
      },
    }));
    if (!saved) {
      this.error.set(
        'Could not save permissions. Your edits are still here; free browser storage and try again.',
      );
      this.toast.error('Could not save permissions. Free some browser storage and try again.');
      return;
    }
    this.toast.success('Permission configuration saved.');
  }
}
