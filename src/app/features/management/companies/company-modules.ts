import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { CompanyUserDialog } from './company-user-dialog';
import { ManagementRole } from '../shared/role-pill';
import { ManagementStore, Member } from '../shared/management.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { companyModifiedAt } from './company-profile.models';
import {
  ADDON_CATALOG,
  MODULE_CATALOG,
  SUBSCRIPTION_PLANS,
  ModuleSection,
  SubscriptionInvoice,
  initialSubscription,
  subscriptionErrors,
  invoiceErrors,
  subscriptionCsv,
} from './company-modules.models';

@Component({
  selector: 'cv-company-modules',
  host: {
    class: 'companies-page company-profile-page company-modules-page',
    '[attr.data-section]': 'section()',
  },
  imports: [
    FormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    MatSelectModule,
    CvSelect,
    MatDialogModule,
    MatMenuModule,
    ManagementRole,
  ],
  templateUrl: './company-modules.html',
})
export class CompanyModulesPage {
  protected readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected get id(): string {
    return this.params().get('id') ?? '';
  }
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected readonly section = computed<ModuleSection>(() => {
    const section = this.params().get('section') ?? 'overview';
    return ['overview', 'subscription', 'limits', 'addons', 'billing', 'configure'].includes(
      section,
    )
      ? (section as ModuleSection)
      : 'overview';
  });
  protected readonly catalog = MODULE_CATALOG;
  protected readonly addons = ADDON_CATALOG;
  protected readonly plans = SUBSCRIPTION_PLANS;
  protected readonly tabs = [
    { key: 'overview', label: 'Modules & Access' },
    { key: 'subscription', label: 'Subscription Details' },
    { key: 'limits', label: 'Users & Limits' },
    { key: 'addons', label: 'Add-ons' },
    { key: 'billing', label: 'Billing History' },
  ];
  protected draft = initialSubscription(this.company());
  protected selectedModules = [...(this.company()?.modules ?? [])];
  private baseline = this.snapshot();
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly selectedModule = computed(() =>
    MODULE_CATALOG.find((m) => m.name === this.query().get('module')),
  );
  protected readonly workspaceData = computed(() =>
    this.id === this.store.companyId() ? this.store.data() : this.store.records()[this.id],
  );
  protected readonly members = computed(() => this.workspaceData()?.members ?? []);
  protected readonly assignedUsers = computed(
    () =>
      this.members().filter((m) => ['active', 'invited'].includes(m.status.toLowerCase())).length,
  );
  protected readonly activeUsers = computed(
    () => this.members().filter((m) => m.status.toLowerCase() === 'active').length,
  );
  protected readonly invitedUsers = computed(
    () => this.members().filter((m) => m.status.toLowerCase() === 'invited').length,
  );
  protected readonly sameWorkspace = computed(() => this.store.companyId() === this.id);
  protected readonly memberSearch = signal('');
  protected readonly invoiceSearch = signal('');
  protected readonly invoiceStatus = signal('All');
  protected readonly invoiceForm = signal(false);
  protected readonly invoiceError = signal('');
  protected invoice = this.emptyInvoice();
  private snapshot(): string {
    return JSON.stringify([this.draft, this.selectedModules]);
  }
  protected hasChanges(): boolean {
    return this.snapshot() !== this.baseline;
  }
  canLeave(nextUrl?: string): boolean {
    if (
      nextUrl
        ?.split(/[?#]/)[0]
        .startsWith('/manage/companies/' + encodeURIComponent(this.id) + '/modules/')
    )
      return true;
    return (
      (!this.hasChanges() && !this.invoiceForm()) ||
      window.confirm('You have unsaved module or subscription changes. Leave without saving?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges() || this.invoiceForm()) event.preventDefault();
  }
  protected link(section = 'overview'): string[] {
    return ['/manage/companies', this.id, 'modules', section];
  }
  protected toggleModule(name: string): void {
    if (this.selectedModules.includes(name)) {
      if (
        !window.confirm(
          'Disable ' +
            name +
            '? Its workspace pages will become unavailable after saving. Existing records will be kept.',
        )
      )
        return;
      this.selectedModules = this.selectedModules.filter((m) => m !== name);
    } else this.selectedModules = [...this.selectedModules, name];
  }
  protected permissionSummary(name: string): string {
    const permissions = this.workspaceData()?.permissions;
    if (!permissions) return 'No role permissions recorded';
    const roles = Object.entries(permissions)
      .filter(([key, actions]) => key.endsWith(':' + name) && actions[0])
      .map(([key]) => key.slice(0, -(name.length + 1)));
    return roles.length ? roles.length + ' roles with view access' : 'No roles with view access';
  }
  protected userPercent(): number | null {
    return this.draft.userLimit
      ? Math.round((this.assignedUsers() / this.draft.userLimit) * 100)
      : null;
  }
  protected openUserDialog(mode: 'invite' | 'edit' | 'delete', member?: Member): void {
    if (!this.sameWorkspace()) {
      this.toast.info('Select this company’s workspace to manage its users.');
      return;
    }
    this.dialog.open(CompanyUserDialog, {
      width: '440px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: mode === 'invite' ? '#cm-user-email' : 'first-tabbable',
      data: { companyId: this.id, mode, member: member ? structuredClone(member) : undefined },
    });
  }
  protected filteredMembers() {
    const q = this.memberSearch().trim().toLowerCase();
    return this.members().filter((m) =>
      (m.name + ' ' + m.email + ' ' + m.role).toLowerCase().includes(q),
    );
  }
  protected filteredInvoices() {
    const q = this.invoiceSearch().trim().toLowerCase();
    return this.draft.invoices
      .filter(
        (v) =>
          v.reference.toLowerCase().includes(q) &&
          (this.invoiceStatus() === 'All' || v.status === this.invoiceStatus()),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  protected totalOutstanding(): number {
    return this.draft.invoices
      .filter((v) => v.status === 'Outstanding')
      .reduce((sum, v) => sum + v.amount, 0);
  }
  protected sectionStats(): {
    label: string;
    value: number;
    hint: string;
    icon: string;
    color: string;
    currency?: boolean;
  }[] {
    if (this.section() === 'billing')
      return [
        {
          label: 'Invoice Records',
          value: this.draft.invoices.length,
          hint: 'Current company',
          icon: 'receipt_long',
          color: '#008afa',
        },
        {
          label: 'Recorded Paid',
          value: this.draft.invoices
            .filter((v) => v.status === 'Paid')
            .reduce((sum, v) => sum + v.amount, 0),
          currency: true,
          hint: 'Manually recorded · GBP',
          icon: 'task_alt',
          color: '#00a34e',
        },
        {
          label: 'Outstanding',
          value: this.totalOutstanding(),
          currency: true,
          hint: 'Recorded invoices · GBP',
          icon: 'schedule',
          color: '#ff8a00',
        },
      ];
    const requests = Object.values(this.draft.addons);
    return [
      {
        label: 'Add-on Options',
        value: this.addons.length,
        hint: 'Available to request',
        icon: 'extension',
        color: '#008afa',
      },
      {
        label: 'Add-on Requests',
        value: requests.filter((v) => v.status === 'Requested').length,
        hint: 'Current company',
        icon: 'playlist_add_check',
        color: '#03a6c1',
      },
      {
        label: 'Trial Requests',
        value: requests.filter((v) => v.status === 'Trial requested').length,
        hint: 'Pending review',
        icon: 'science',
        color: '#7c3aed',
      },
    ];
  }
  protected requestAddon(id: string, trial = false): void {
    this.draft.addons[id] = {
      status: trial ? 'Trial requested' : 'Requested',
      requestedAt: new Date().toISOString(),
    };
  }
  protected removeAddon(id: string): void {
    delete this.draft.addons[id];
  }
  protected discard(): void {
    if (
      (this.hasChanges() || this.invoiceForm()) &&
      !window.confirm('Discard unsaved module and subscription changes?')
    )
      return;
    this.draft = initialSubscription(this.company());
    this.selectedModules = [...(this.company()?.modules ?? [])];
    this.baseline = this.snapshot();
    this.error.set('');
    this.submitted.set(false);
    this.invoiceForm.set(false);
  }
  protected errors(): string[] {
    return subscriptionErrors(this.draft, this.assignedUsers());
  }
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.errors().length) return;
    if (this.invoiceForm()) {
      this.error.set('Add or cancel the invoice record before saving.');
      return;
    }
    const current = this.company();
    if (!current) return;
    const next = {
      ...current,
      modules: [...this.selectedModules],
      subscription: structuredClone(this.draft),
      modifiedAt: new Date().toISOString(),
      modifiedBy: this.auth.currentUser()?.name ?? 'Administrator',
    };
    if (!this.store.saveCompany(next)) {
      this.error.set('Changes could not be saved. Free some browser storage and try again.');
      return;
    }
    this.baseline = this.snapshot();
    this.submitted.set(false);
    this.toast.success('Module and subscription records saved.');
  }
  private emptyInvoice(): SubscriptionInvoice {
    return {
      id: crypto.randomUUID(),
      reference: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: '',
      amount: 0,
      status: 'Outstanding',
      notes: '',
    };
  }
  protected openInvoice(): void {
    this.invoice = this.emptyInvoice();
    this.invoiceError.set('');
    this.invoiceForm.set(true);
  }
  protected editInvoice(record: SubscriptionInvoice): void {
    this.invoice = structuredClone(record);
    this.invoiceError.set('');
    this.invoiceForm.set(true);
  }
  constructor() {
    let currentId = this.id;
    effect(() => {
      const nextId = this.params().get('id') ?? '';
      if (nextId === currentId) return;
      currentId = nextId;
      untracked(() => {
        this.draft = initialSubscription(this.company());
        this.selectedModules = [...(this.company()?.modules ?? [])];
        this.baseline = this.snapshot();
        this.error.set('');
        this.submitted.set(false);
        this.invoiceForm.set(false);
        this.memberSearch.set('');
        this.invoiceSearch.set('');
      });
    });
  }
  protected addInvoice(): void {
    const errors = invoiceErrors(
      this.invoice,
      this.draft.invoices.filter((v) => v.id !== this.invoice.id),
    );
    this.invoiceError.set(errors.join(' '));
    if (errors.length) return;
    const next = {
      ...this.invoice,
      reference: this.invoice.reference.trim(),
      notes: this.invoice.notes.trim(),
    };
    this.draft.invoices = this.draft.invoices.some((v) => v.id === next.id)
      ? this.draft.invoices.map((v) => (v.id === next.id ? next : v))
      : [...this.draft.invoices, next];
    this.invoiceForm.set(false);
  }
  protected exportInvoices(): void {
    const invoices = this.filteredInvoices();
    if (!invoices.length) return;
    this.store.download(
      'subscription-billing-' + this.id + '.csv',
      subscriptionCsv(invoices),
      'text/csv;charset=utf-8',
    );
  }
}
