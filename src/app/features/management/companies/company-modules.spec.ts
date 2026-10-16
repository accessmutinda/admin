import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyModulesPage } from './company-modules';
import {
  CompanySubscription,
  SubscriptionInvoice,
  initialSubscription,
  invoiceErrors,
  subscriptionErrors,
  subscriptionCsv,
  MODULE_CATALOG,
} from './company-modules.models';
import { moduleGuard } from '../shared/module.guard';

@Component({ template: '' })
class EmptyPage {}
interface ModuleEditor {
  draft: CompanySubscription;
  selectedModules: string[];
  hasChanges(): boolean;
  save(): void;
  discard(): void;
  error(): string;
  errors(): string[];
  toggleModule(name: string): void;
  requestAddon(id: string, trial?: boolean): void;
  removeAddon(id: string): void;
  section(): string;
  assignedUsers(): number;
  filteredMembers(): { name: string }[];
  memberSearch: { set(value: string): void };
  invoiceSearch: { set(value: string): void };
  filteredInvoices(): SubscriptionInvoice[];
  invoiceForm(): boolean;
  openInvoice(): void;
  invoice: SubscriptionInvoice;
  addInvoice(): void;
  editInvoice(record: SubscriptionInvoice): void;
  invoiceError(): string;
  exportInvoices(): void;
  canLeave(url?: string): boolean;
}

describe('Company modules and subscription', () => {
  let store: ManagementStore;
  let harness: RouterTestingHarness;
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/companies/:id/modules',
            pathMatch: 'full',
            redirectTo: 'manage/companies/:id/modules/overview',
          },
          {
            path: 'manage/companies/:id/modules/:section',
            component: CompanyModulesPage,
            canDeactivate: [
              (component: CompanyModulesPage, _route, _state, next) => component.canLeave(next.url),
            ],
          },
          { path: 'manage/companies', component: EmptyPage },
          {
            path: 'manage/test-finance',
            component: EmptyPage,
            canActivate: [moduleGuard],
            data: { module: 'Finance' },
          },
        ]),
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());
  async function open(section = 'overview', id = 'lqcs') {
    const component = await harness.navigateByUrl(
      '/manage/companies/' + id + '/modules/' + section,
      CompanyModulesPage,
    );
    return component as unknown as ModuleEditor;
  }
  it('renders saved module cards and honest empty subscription data', async () => {
    const editor = await open();
    expect(harness.routeNativeElement!.querySelectorAll('.cm-module').length).toBe(6);
    for (const module of MODULE_CATALOG)
      expect(harness.routeNativeElement!.textContent).toContain(module.name);
    expect(harness.routeNativeElement!.textContent).toContain('Plan not recorded');
    expect(harness.routeNativeElement!.textContent).toContain('No billing records');
    expect(editor.hasChanges()).toBe(false);
  });
  it('opens all five sections through real links and preserves the draft without confirmation', async () => {
    const editor = await open();
    editor.draft.plan = 'Professional';
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    for (const section of ['subscription', 'limits', 'addons', 'billing', 'overview']) {
      const link = harness.routeNativeElement!.querySelector(
        '.cm-tabs a[href$="/' + section + '"]',
      ) as HTMLAnchorElement;
      expect(link).toBeTruthy();
      link.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toContain('/' + section);
      expect(editor.section()).toBe(section);
      expect(editor.draft.plan).toBe('Professional');
    }
    expect(confirm).not.toHaveBeenCalled();
    expect(editor.hasChanges()).toBe(true);
  });
  it('opens every module configuration', async () => {
    await open();
    for (const module of MODULE_CATALOG) {
      await harness.navigateByUrl(
        '/manage/companies/lqcs/modules/configure?module=' + encodeURIComponent(module.name),
        CompanyModulesPage,
      );
      expect(harness.routeNativeElement!.textContent).toContain(module.name + ' Configuration');
      expect(harness.routeNativeElement!.textContent).toContain('Manage role permissions');
    }
  });
  it('applies module changes to existing route access only after saving', async () => {
    const editor = await open();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    editor.toggleModule('Finance');
    expect(store.company()!.modules).toContain('Finance');
    editor.save();
    expect(store.company()!.modules).not.toContain('Finance');
    expect(editor.hasChanges()).toBe(false);
    await harness.navigateByUrl('/manage/test-finance');
    expect(TestBed.inject(Router).url).toBe('/manage/companies');
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Finance is not enabled'));
  });
  it('keeps a module selected if disabling is cancelled', async () => {
    const editor = await open();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    editor.toggleModule('Finance');
    expect(editor.selectedModules).toContain('Finance');
    expect(editor.hasChanges()).toBe(false);
  });
  it('validates limits and dates before saving', async () => {
    const editor = await open('limits');
    editor.draft.userLimit = 1;
    editor.draft.storageLimitGb = -10;
    editor.draft.careRecordLimit = 1.5;
    editor.draft.renewalDate = '2026-02-30';
    editor.save();
    expect(editor.errors().join(' ')).toContain('lower than active and invited users');
    expect(editor.errors().join(' ')).toContain('valid renewal date');
    expect(store.company()!.subscription).toBeUndefined();
    expect(editor.hasChanges()).toBe(true);
    expect(subscriptionErrors(initialSubscription(), 10)).toEqual([]);
  });
  it('records subscription details and add-on requests without changing other company data', async () => {
    const before = structuredClone(store.company()!);
    const editor = await open('addons');
    editor.draft.plan = 'Professional';
    editor.draft.status = 'Active';
    editor.draft.userLimit = 100;
    editor.requestAddon('sso', true);
    editor.save();
    expect(store.company()!.subscription!.addons['sso'].status).toBe('Trial requested');
    expect(store.company()!.subscription!.plan).toBe('Professional');
    expect(store.company()!.modules).toEqual(before.modules);
    expect(store.company()!.modifiedBy).toBe('Jane Doe');
    expect(store.company()!.contacts).toEqual(before.contacts);
    expect(store.companies().find((c) => c.id === 'riverside')?.subscription).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('cv_companies_v1')!)[0].subscription.plan).toBe(
      'Professional',
    );
    harness.detectChanges();
    const remove = harness.routeNativeElement!.querySelector(
      '.cm-addon[data-addon="sso"] button',
    ) as HTMLButtonElement;
    expect(remove.textContent).toContain('Remove');
    remove.click();
    await harness.fixture.whenStable();
    expect(editor.draft.addons['sso']).toBeUndefined();
    expect(store.company()!.subscription!.addons['sso']).toBeTruthy();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    editor.discard();
    expect(editor.draft.addons['sso']).toBeTruthy();
  });
  it('retains drafts and shows a retryable error when storage fails', async () => {
    const editor = await open('subscription');
    editor.draft.plan = 'Standard';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    editor.save();
    expect(editor.error()).toContain('could not be saved');
    expect(editor.draft.plan).toBe('Standard');
    expect(editor.hasChanges()).toBe(true);
    expect(store.company()!.subscription).toBeUndefined();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('validates, adds and edits billing records while keeping payment processing separate', async () => {
    const editor = await open('billing');
    editor.openInvoice();
    editor.addInvoice();
    expect(editor.invoiceError()).toContain('reference');
    editor.invoice = {
      id: 'inv-1',
      reference: 'SUB-001',
      date: '2026-10-01',
      dueDate: '2026-10-31',
      amount: 120.5,
      status: 'Outstanding',
      notes: 'Agreed monthly subscription',
    };
    editor.addInvoice();
    expect(editor.invoiceForm()).toBe(false);
    expect(store.company()!.subscription).toBeUndefined();
    editor.save();
    expect(store.company()!.subscription!.invoices).toHaveLength(1);
    editor.editInvoice(editor.draft.invoices[0]);
    editor.invoice.status = 'Paid';
    editor.addInvoice();
    editor.save();
    expect(store.company()!.subscription!.invoices).toHaveLength(1);
    expect(store.company()!.subscription!.invoices[0].status).toBe('Paid');
    expect(invoiceErrors({ ...editor.invoice, id: 'duplicate' }, editor.draft.invoices)).toContain(
      'This invoice reference already exists.',
    );
    expect(
      invoiceErrors({ ...editor.invoice, dueDate: '2026-09-01', amount: 1.234 }, []).length,
    ).toBe(2);
  });
  it('exports filtered billing rows and neutralises spreadsheet formulas', async () => {
    const editor = await open('billing');
    editor.draft.invoices = [
      {
        id: '1',
        reference: '=SAMPLE()',
        date: '2026-10-01',
        dueDate: '2026-10-31',
        amount: 10,
        status: 'Paid',
        notes: '"quoted"',
      },
      {
        id: '2',
        reference: 'OTHER',
        date: '2026-10-01',
        dueDate: '2026-10-31',
        amount: 20,
        status: 'Outstanding',
        notes: '',
      },
    ];
    editor.invoiceSearch.set('sample');
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    editor.exportInvoices();
    expect(download).toHaveBeenCalledWith(
      'subscription-billing-lqcs.csv',
      expect.stringContaining("'=SAMPLE()"),
      'text/csv;charset=utf-8',
    );
    const csv = subscriptionCsv(editor.filteredInvoices());
    expect(csv).not.toContain('OTHER');
    expect(csv).toContain('""quoted""');
    for (const notes of [' =FORMULA()', '\n=FORMULA()', '+FORMULA()', '@FORMULA()']) {
      expect(subscriptionCsv([{ ...editor.draft.invoices[0], notes }])).toContain('"\'' + notes);
    }
  });
  it('protects unsaved changes when leaving the module pages', async () => {
    const editor = await open();
    editor.draft.plan = 'Starter';
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/manage/companies');
    expect(TestBed.inject(Router).url).toContain('/modules/overview');
    expect(confirm).toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await harness.navigateByUrl('/manage/companies');
    expect(TestBed.inject(Router).url).toBe('/manage/companies');
  });
  it('uses the route company for users and prevents editing another workspace through access links', async () => {
    const other = store.companies().find((c) => c.id !== 'lqcs')!;
    const editor = await open('limits', other.id);
    expect(editor.assignedUsers()).toBe(0);
    expect(harness.routeNativeElement!.querySelector('a[href="/manage/access"]')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('No user accounts recorded');
    editor.draft.plan = 'Starter';
    editor.save();
    expect(store.companies().find((c) => c.id === other.id)!.subscription!.plan).toBe('Starter');
    expect(store.company()!.subscription).toBeUndefined();
  });
  it('resets drafts when navigating to another company on the same route', async () => {
    const editor = await open();
    const other = store.companies().find((c) => c.id !== 'lqcs')!;
    editor.draft.plan = 'Starter';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const next = await open('subscription', other.id);
    harness.detectChanges();
    expect(next.draft.plan).toBe('Not recorded');
    expect(next.hasChanges()).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain(other.name);
  });
  it('shows a useful missing company state and redirects the base modules link', async () => {
    await harness.navigateByUrl('/manage/companies/lqcs/modules');
    expect(TestBed.inject(Router).url).toBe('/manage/companies/lqcs/modules/overview');
    await open('overview', 'missing');
    expect(harness.routeNativeElement!.textContent).toContain('Company not found');
  });
});
