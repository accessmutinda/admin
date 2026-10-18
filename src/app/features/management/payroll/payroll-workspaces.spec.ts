import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { emptyRota } from '../rota/rota.models';
import { ClientInvoice, emptyEcm } from '../ecm/ecm.models';
import { emptyPayroll, Invoice } from './payroll.models';
import { Payroll } from './payroll';

const invoice = (id: string, paid = 0, status: Invoice['status'] = 'Approved'): Invoice => ({
  id,
  number: id,
  contractorId: 'supplier',
  issued: '2026-10-01',
  due: '2026-10-30',
  start: '2026-10-01',
  end: '2026-10-01',
  status,
  createdBy: DEMO_USER.id,
  lines: [{ description: 'Care', quantity: 1, rate: 100, vat: 0 }],
  audit: [],
  payments: paid ? [{ date: '2026-10-02', amount: paid, reference: 'Bank reference' }] : [],
});

describe('Payroll and billing workspaces', () => {
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'manage/finance/:area', component: Payroll }])],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
    store = TestBed.inject(ManagementStore);
  });

  it('opens billing cards and scopes the payment shortcut to approved unpaid and partial balances', async () => {
    const data = emptyPayroll();
    data.invoices = [
      invoice('unpaid'),
      invoice('partial', 40),
      invoice('paid', 100),
      invoice('rejected', 0, 'Rejected'),
    ];
    store.savePayroll(data);
    const before = JSON.stringify(store.data().payroll);
    const harness = await RouterTestingHarness.create('/manage/finance/billing');
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('cv-finance-area-home .co-check-card')).toHaveLength(4);
    Array.from(page.querySelectorAll<HTMLAnchorElement>('.co-check-card'))
      .find((card) => card.textContent?.includes('Awaiting Payment'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('status=Outstanding');
    const rows = Array.from(page.querySelectorAll('tbody tr')).map((row) => row.textContent);
    expect(rows).toHaveLength(2);
    expect(rows.join(' ')).toContain('unpaid');
    expect(rows.join(' ')).toContain('partial');
    expect(rows.join(' ')).not.toContain('rejected');
    page.querySelector<HTMLButtonElement>('tbody tr button')!.click();
    harness.detectChanges();
    expect(page.querySelector('[role="dialog"].finance-review-drawer')).not.toBeNull();
    expect(page.querySelector('[role="dialog"]')?.textContent).toContain('Record a payment');
    expect(JSON.stringify(store.data().payroll)).toBe(before);
  });

  it('paginates a register at eight rows and resets the page when search changes', async () => {
    const data = emptyPayroll();
    data.invoices = Array.from({ length: 11 }, (_, i) => invoice('Invoice-' + i));
    store.savePayroll(data);
    const harness = await RouterTestingHarness.create('/manage/finance/billing?view=Invoices');
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('tbody tr')).toHaveLength(8);
    page.querySelector<HTMLButtonElement>('.finance-register-footer button:last-child')!.click();
    harness.detectChanges();
    expect(page.querySelectorAll('tbody tr')).toHaveLength(3);
    const search = page.querySelector<HTMLInputElement>(
      'input[aria-label="Search payroll records"]',
    )!;
    search.value = 'Invoice-10';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(page.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(page.querySelector('.finance-register-footer')?.textContent).toContain('Page 1 of 1');
    expect(page.querySelector('.finance-filter-card')?.contains(search)).toBe(true);
  });

  it('paginates client invoices and opens preparation only from its toolbar action', async () => {
    const records: ClientInvoice[] = Array.from({ length: 11 }, (_, index) => ({
      id: 'client-' + index,
      clientId: 'client',
      number: 'C-' + index,
      date: '2026-10-01',
      state: 'Draft',
      lines: [],
      audit: [],
    }));
    store.update((data) => ({
      ...data,
      rota: { ...(data.rota ?? emptyRota()), ecm: { ...emptyEcm(), invoices: records } },
    }));
    const before = JSON.stringify(store.data().rota);
    const harness = await RouterTestingHarness.create(
      '/manage/finance/billing?view=Invoices&invoiceView=Clients',
    );
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('cv-client-billing tbody tr')).toHaveLength(8);
    page
      .querySelector<HTMLButtonElement>(
        'cv-client-billing .finance-register-footer button:last-child',
      )!
      .click();
    harness.detectChanges();
    expect(page.querySelectorAll('cv-client-billing tbody tr')).toHaveLength(3);
    expect(page.querySelector('cv-client-billing form')).toBeNull();
    page
      .querySelector<HTMLButtonElement>('cv-client-billing .panel-toolbar .button.primary')!
      .click();
    harness.detectChanges();
    expect(page.querySelector('[role="dialog"] #prepare-client-invoices-title')).not.toBeNull();
    page
      .querySelector<HTMLButtonElement>('button[aria-label="Close invoice preparation"]')!
      .click();
    harness.detectChanges();
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    expect(JSON.stringify(store.data().rota)).toBe(before);
  });
});
