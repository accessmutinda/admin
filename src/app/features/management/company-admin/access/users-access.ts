import { CompanyUnavailable } from '../../shared/company-unavailable';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementRole } from '../../shared/role-pill';
import { CompanyLoading } from '../../companies/company-loading';
import { companyModifiedAt } from '../../companies/company-profile.models';
import { PAYROLL_ACTIONS, PayrollAction } from '../../payroll/payroll.models';
import { ROTA_ACTIONS, RotaAction } from '../../rota/rota.models';
import { accessCsv, permissionLevel } from './access.models';
import { ProductModule, ProductSubmodule } from '../../../../core/access/company-access.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  CompanyAccessService,
  CompanyRole,
  ModuleConfiguration,
} from '../../../../core/access/company-access.service';
import { ManagementStore, Member } from '../../shared/management.store';
import { CompanyUserDialog } from '../../companies/company-user-dialog';

interface ApiMember {
  id: string;
  name: string;
  email: string;
  status: string;
  role_codes: string[];
  version: number;
  department?: string;
  last_login_at?: string;
  latest_access_change?: {
    at: string;
    actor: { name: string } | null;
    action: string;
    subject: string;
  };
  mfa: { required: boolean; confirmed: boolean; override: string };
}

@Component({
  selector: 'cv-users-access',
  imports: [
    CompanyUnavailable,
    FormsModule,
    RouterLink,
    MatDialogModule,
    MatMenuModule,
    MatSelectModule,
    CvSelect,
    ManagementRole,
    CompanyLoading,
  ],
  host: { class: 'module-page companies-page users-access-page' },
  templateUrl: './users-access.html',
})
export class UsersAccess {
  protected readonly access = inject(CompanyAccessService);
  protected readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private invitedCompany = '';
  protected readonly company = this.store.company;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly roles = signal<CompanyRole[]>([]);
  protected readonly configuration = signal<ModuleConfiguration | null>(null);
  protected readonly members = signal<ApiMember[]>([]);
  protected readonly invitations = signal<
    { id: string; email: string; role_code: string; status: string; delivery_state: string }[]
  >([]);
  protected readonly selectedId = signal('');
  protected readonly selected = computed(() =>
    this.roles().find((role) => role.id === this.selectedId()),
  );
  protected readonly selectedModule = signal('care');
  protected readonly module = computed(() =>
    this.configuration()?.modules.find((module) => module.code === this.selectedModule()),
  );
  protected readonly permissionCodes = signal<string[]>([]);
  protected readonly coreCodes = signal<string[]>([]);
  protected readonly search = signal('');
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly compact = toSignal(inject(BreakpointObserver).observe('(max-width: 767px)'));
  protected readonly page = signal(1);
  protected readonly pageSize = 5;
  protected readonly selection = signal<string[]>([]);
  protected readonly statusFilter = signal('all');
  protected readonly roleFilter = signal('all');
  protected readonly tableMembers = computed(() => [
    ...this.members().map(
      (member) =>
        ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: this.roleNames(member.role_codes),
          roleCode: member.role_codes[0],
          status:
            member.status === 'active'
              ? 'Active'
              : member.status === 'revoked'
                ? 'Revoked'
                : 'Suspended',
          version: member.version,
          department: member.department,
          lastLoginAt: member.last_login_at,
          mfaPolicy: member.mfa.override,
          required: member.mfa.required,
        }) as Member & { required?: boolean },
    ),
    ...this.invitations()
      .filter((invite) => invite.status === 'pending')
      .map(
        (invite) =>
          ({
            id: invite.id,
            name: '',
            email: invite.email,
            role: this.roleNames([invite.role_code]),
            roleCode: invite.role_code,
            status: 'Invited',
          }) as Member & { required?: boolean },
      ),
  ]);
  protected readonly filtered = computed(() =>
    this.tableMembers().filter(
      (member) =>
        `${member.name} ${member.email} ${member.role} ${member.department ?? ''}`
          .toLowerCase()
          .includes(this.search().trim().toLowerCase()) &&
        (this.statusFilter() === 'all' || member.status === this.statusFilter()) &&
        (this.roleFilter() === 'all' || member.role === this.roleFilter()),
    ),
  );
  protected readonly memberRoles = computed(() => [
    ...new Set([
      ...this.roles().map((role) => role.name),
      ...this.tableMembers().map((member) => member.role),
    ]),
  ]);
  protected readonly statuses = computed(() => [
    ...new Set([
      'Active',
      'Invited',
      'Suspended',
      'Revoked',
      ...this.tableMembers().map((member) => member.status),
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
  protected readonly history = computed(() =>
    this.members()
      .filter((member) => !!member.latest_access_change)
      .map((member) => ({
        at: member.latest_access_change!.at,
        actor: member.latest_access_change!.actor?.name || 'Not recorded',
        action: member.latest_access_change!.action,
        subject: member.name || member.email,
        detail: 'Company membership changed',
      })),
  );
  protected readonly modules = computed(() => this.configuration()?.modules ?? []);
  protected readonly moduleColors = [
    '#008afa',
    '#00a34e',
    '#ff8a00',
    '#7c3aed',
    '#03a6c1',
    '#ed3988',
  ];
  protected readonly moduleIcons: Record<string, string> = {
    care: 'favorite',
    people: 'groups',
    academy: 'school',
    quality: 'verified_user',
    finance: 'account_balance_wallet',
    reports: 'monitoring',
    staff_portal: 'badge',
    family_portal: 'family_restroom',
    inspector_portal: 'fact_check',
  };
  protected readonly rotaActions = ROTA_ACTIONS;
  protected readonly payrollActions = PAYROLL_ACTIONS;
  protected readonly payrollActionDescriptions: Record<PayrollAction, string> = {
    view: 'Read pay runs, overtime and invoices',
    manage: 'Maintain staff pay, work records and invoices',
    approve: 'Review overtime and contractor invoices',
    finalise: 'Lock approved pay runs for payment',
    export: 'Download payroll reports and payment files',
    pay: 'Record pay-run and invoice payments',
  };
  protected readonly rotaAccess = computed(() =>
    this.rotaActions.filter((action) => this.hasRotaAction(action.key)).map((action) => action.key),
  );
  protected readonly payrollAccess = computed(() =>
    this.payrollActions
      .filter((action) => this.hasPayrollAction(action.key))
      .map((action) => action.key),
  );
  private readonly drafts = new Map<string, { permissions: string[]; core: string[] }>();
  private closeDialog?: () => void;
  protected readonly creating = signal(false);
  protected name = '';
  protected code = '';
  protected description = '';
  private roleCreateKey = crypto.randomUUID();
  protected readonly actions = [
    { code: 'read', label: 'View' },
    { code: 'create', label: 'Create' },
    { code: 'edit', label: 'Edit' },
    { code: 'archive', label: 'Delete' },
    { code: 'export', label: 'Export' },
    { code: 'manage_users', label: 'User Management' },
    { code: 'approve', label: 'Approve' },
    { code: 'finalise', label: 'Finalise' },
    { code: 'pay', label: 'Pay' },
    { code: 'publish', label: 'Publish' },
  ];
  protected readonly writable = computed(
    () =>
      this.access.context()?.company_id === this.access.companyId() &&
      !!this.access.context()?.can_manage_roles,
  );
  constructor() {
    effect(() => {
      const id = this.access.companyId();
      untracked(() => {
        this.closeDialog?.();
        this.drafts.clear();
        this.selection.set([]);
        this.search.set('');
        this.statusFilter.set('all');
        this.roleFilter.set('all');
        this.page.set(1);
        this.roles.set([]);
        this.members.set([]);
        this.invitations.set([]);
        this.selectedId.set('');
        this.permissionCodes.set([]);
        this.coreCodes.set([]);
        this.configuration.set(null);
        if (id) void this.load();
      });
    });
  }
  protected async load(): Promise<void> {
    const id = this.access.companyId();
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const [roles, configuration] = await Promise.all([
        this.access.roles(id),
        this.access.configuration(id),
      ]);
      if (id !== this.access.companyId()) return;
      this.roles.set(roles.results);
      this.configuration.set(configuration);
      const requestedRole = this.route.snapshot.queryParamMap.get('role');
      this.choose(
        this.selectedId() ||
          roles.results.find((role) => role.code === requestedRole || role.name === requestedRole)
            ?.id ||
          roles.results.find((role) => role.code === 'RM')?.id ||
          roles.results[0]?.id ||
          '',
      );
      if (
        this.route.snapshot.queryParamMap.get('invite') === 'true' &&
        this.invitedCompany !== id
      ) {
        this.invitedCompany = id;
        this.openMember('invite', undefined, 'Company Admin');
      }
      if (this.access.core('company.memberships.read')) {
        const [members, invitations] = await Promise.all([
          this.auth.api<{ results: ApiMember[] }>(`/companies/${id}/memberships`),
          this.auth.api<{ results: any[] }>(`/companies/${id}/invitations`),
        ]);
        if (id === this.access.companyId()) {
          this.members.set(members.results);
          this.invitations.set(invitations.results);
        }
      }
    } catch (error) {
      if (id === this.access.companyId())
        this.error.set(error instanceof Error ? error.message : 'Company access unavailable.');
    } finally {
      if (id === this.access.companyId()) this.loading.set(false);
    }
  }
  protected choose(id: string): void {
    const previous = this.selectedId();
    if (previous && previous !== id)
      this.drafts.set(previous, {
        permissions: [...this.permissionCodes()],
        core: [...this.coreCodes()],
      });
    this.selectedId.set(id);
    const role = this.selected();
    const draft = this.drafts.get(id);
    this.permissionCodes.set(draft?.permissions ?? role?.permissions.map((p) => p.code) ?? []);
    this.coreCodes.set(draft?.core ?? [...(role?.core_permissions ?? [])]);
    this.notice.set('');
  }
  protected has(module: string, sub: string, action: string): boolean {
    return this.permissionCodes().includes(`${module}.${sub}.${action}`);
  }
  protected toggle(module: string, sub: string, action: string): void {
    const code = `${module}.${sub}.${action}`;
    const codes = new Set(this.permissionCodes());
    if (codes.has(code)) codes.delete(code);
    else codes.add(code);
    this.permissionCodes.set([...codes]);
    this.notice.set('');
  }
  protected coreToggle(code: string): void {
    this.coreCodes.update((codes) =>
      codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code],
    );
  }
  protected dirty(): boolean {
    const role = this.selected();
    return (
      !!role &&
      (JSON.stringify([...this.permissionCodes()].sort()) !==
        JSON.stringify(role.permissions.map((p) => p.code).sort()) ||
        JSON.stringify([...this.coreCodes()].sort()) !==
          JSON.stringify([...role.core_permissions].sort()))
    );
  }
  protected async save(): Promise<void> {
    const role = this.selected();
    const id = this.access.companyId();
    if (!role || this.saving() || !this.writable()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.access.saveRole(
        id,
        role,
        this.permissionCodes(),
        this.coreCodes(),
        role.mfa_required,
      );
      if (id === this.access.companyId()) {
        this.roles.update((roles) => roles.map((r) => (r.id === saved.id ? saved : r)));
        this.drafts.delete(saved.id);
        this.choose(saved.id);
        this.notice.set('Role permissions saved.');
        await this.access.refresh();
      }
    } catch (error) {
      if (id === this.access.companyId())
        this.error.set(error instanceof Error ? error.message : 'Permissions could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
  protected async create(): Promise<void> {
    const id = this.access.companyId();
    if (this.saving() || !this.access.context()?.can_create_roles) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const role = await this.access.createRole(
        id,
        {
          code: this.code.trim().toUpperCase(),
          name: this.name.trim(),
          description: this.description.trim(),
        },
        this.roleCreateKey,
      );
      if (id === this.access.companyId()) {
        this.roles.update((roles) => [...roles, role]);
        this.choose(role.id);
        this.creating.set(false);
        this.roleCreateKey = crypto.randomUUID();
        this.name = this.code = this.description = '';
        this.notice.set('Company role created. Choose its permissions below.');
        await this.access.refresh();
      }
    } catch (error) {
      if (id === this.access.companyId())
        this.error.set(error instanceof Error ? error.message : 'Role could not be created.');
    } finally {
      this.saving.set(false);
    }
  }
  protected roleNames(codes: string[]): string {
    return codes
      .map((code) => this.roles().find((role) => role.code === code)?.name ?? code)
      .join(', ');
  }
  protected member(mode: 'invite' | 'edit' | 'delete', record?: ApiMember): void {
    this.openMember(
      mode,
      record ? this.tableMembers().find((member) => member.id === record.id) : undefined,
    );
  }
  protected openMember(
    mode: 'invite' | 'edit' | 'delete',
    member?: Member,
    initialRole?: string,
  ): void {
    if (!this.access.core('company.memberships.manage')) return;
    const id = this.access.companyId();
    const ref = this.dialog.open(CompanyUserDialog, {
      width: '440px',
      maxWidth: 'calc(100vw - 24px)',
      data: { companyId: id, mode, member, initialRole },
    });
    this.closeDialog = () => ref.close();
    ref.afterClosed().subscribe(() => {
      if (id === this.access.companyId()) void this.loadMembers(id);
    });
  }
  private async loadMembers(id: string): Promise<void> {
    if (!this.access.core('company.memberships.read')) return;
    try {
      const [members, invitations] = await Promise.all([
        this.auth.api<{ results: ApiMember[] }>(`/companies/${id}/memberships`),
        this.auth.api<{ results: any[] }>(`/companies/${id}/invitations`),
      ]);
      if (id === this.access.companyId()) {
        this.members.set(members.results);
        this.invitations.set(invitations.results);
      }
    } catch (error) {
      if (id === this.access.companyId())
        this.error.set(error instanceof Error ? error.message : 'Memberships unavailable.');
    }
  }
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
  protected memberMfa(member: Member): boolean {
    return !!(member as Member & { required?: boolean }).required;
  }
  protected memberMfaLabel(member: Member): string {
    const required = (member as Member & { required?: boolean }).required;
    return required === undefined ? 'Not recorded' : required ? 'Required' : 'Not required';
  }
  protected memberMfaSource(member: Member): string {
    return !member.mfaPolicy || member.mfaPolicy === 'inherit' ? 'Role default' : 'User override';
  }
  protected exportUsers(): void {
    if (!this.access.core('company.access.export')) return;
    this.store.download(
      'company-users.csv',
      accessCsv([
        ['Name', 'Email', 'Role', 'Department', 'Access', 'Status', 'Last login', 'MFA'],
        ...this.filtered()
          .filter((member) => !this.selection().length || this.selection().includes(member.id))
          .map((member) => [
            member.name,
            member.email,
            member.role,
            member.department ?? '',
            this.level(member.role).label,
            member.status,
            member.lastLoginAt ?? '',
            this.memberMfaLabel(member),
          ]),
      ]),
    );
  }
  protected exportHistory(): void {
    if (!this.access.core('company.access.export')) return;
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
  protected displayModule(module: ProductModule): string {
    return module.code === 'academy' ? 'CareVerity Academy' : module.name;
  }
  protected availableAction(sub: ProductSubmodule, action: string): boolean {
    return sub.permissions.some((permission) => permission.action === action);
  }
  private moduleCodes(module: ProductModule, action: string): string[] {
    return module.submodules.flatMap((sub) =>
      sub.permissions
        .filter((permission) => permission.action === action)
        .map((permission) => permission.code),
    );
  }
  protected moduleHas(module: ProductModule, action: string): boolean {
    const codes = this.moduleCodes(module, action);
    return !!codes.length && codes.every((code) => this.permissionCodes().includes(code));
  }
  protected modulePartial(module: ProductModule, action: string): boolean {
    return (
      !this.moduleHas(module, action) &&
      this.moduleCodes(module, action).some((code) => this.permissionCodes().includes(code))
    );
  }
  protected toggleModuleAction(module: ProductModule, action: string): void {
    if (!this.writable() || this.saving()) return;
    const codes = new Set(this.permissionCodes());
    const remove = this.moduleHas(module, action);
    for (const code of this.moduleCodes(module, action)) {
      if (remove) codes.delete(code);
      else codes.add(code);
    }
    this.permissionCodes.set([...codes]);
  }
  protected moduleActions(module: ProductModule) {
    return this.actions.slice(0, module.code === 'people' ? 6 : 5);
  }
  protected enabledActions(module: ProductModule): number {
    return this.moduleActions(module).filter((action) => this.moduleHas(module, action.code))
      .length;
  }
  protected permissionCount(): number {
    return this.modules().reduce((count, module) => count + this.enabledActions(module), 0);
  }
  protected level(name: string) {
    const role = this.roles().find((role) => role.name === name);
    return permissionLevel(
      ['read', 'create', 'edit', 'archive', 'export'].map(
        (action) =>
          !!role?.permissions.some((permission) => permission.code.endsWith('.' + action)),
      ),
    );
  }
  protected hasRotaAction(action: RotaAction): boolean {
    return this.has(
      'care',
      'rostering',
      action === 'view' ? 'read' : action === 'manage' || action === 'attendance' ? 'edit' : action,
    );
  }
  protected toggleRotaAction(action: RotaAction): void {
    this.toggle(
      'care',
      'rostering',
      action === 'view' ? 'read' : action === 'manage' || action === 'attendance' ? 'edit' : action,
    );
  }
  protected hasPayrollAction(action: PayrollAction): boolean {
    return this.has(
      'finance',
      'payroll',
      action === 'view' ? 'read' : action === 'manage' ? 'edit' : action,
    );
  }
  protected togglePayrollAction(action: PayrollAction): void {
    this.toggle(
      'finance',
      'payroll',
      action === 'view' ? 'read' : action === 'manage' ? 'edit' : action,
    );
  }
  protected permissionsChanged(): boolean {
    return this.dirty();
  }
  protected discardPermissions(): void {
    this.drafts.delete(this.selectedId());
    this.choose(this.selectedId());
  }
  protected savePermissions(): Promise<void> {
    return this.save();
  }
  protected applyPermissionPreset(preset: 'view' | 'standard' | 'none'): void {
    if (!this.writable() || this.saving()) return;
    const actions =
      preset === 'none' ? [] : preset === 'view' ? ['read'] : ['read', 'create', 'edit', 'export'];
    this.permissionCodes.set(
      this.modules().flatMap((module) =>
        module.submodules.flatMap((sub) =>
          sub.permissions
            .filter((permission) => actions.includes(permission.action))
            .map((permission) => permission.code),
        ),
      ),
    );
  }
  private hasDirtyDrafts(): boolean {
    return (
      this.dirty() ||
      [...this.drafts.entries()].some(([id, draft]) => {
        const role = this.roles().find((role) => role.id === id);
        return (
          !!role &&
          (JSON.stringify([...draft.permissions].sort()) !==
            JSON.stringify(role.permissions.map((permission) => permission.code).sort()) ||
            JSON.stringify([...draft.core].sort()) !==
              JSON.stringify([...role.core_permissions].sort()))
        );
      })
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (this.hasDirtyDrafts() || this.saving()) event.preventDefault();
  }
  canLeave(): boolean {
    return (
      !this.saving() &&
      (!this.hasDirtyDrafts() || window.confirm('Leave without saving role permission changes?'))
    );
  }
}
