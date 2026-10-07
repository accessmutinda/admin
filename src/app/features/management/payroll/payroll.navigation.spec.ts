import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { Payroll } from './payroll';
import { ManagementLayout } from '../layout/management-layout';
import { ManagementStore } from '../shared/management.store';
import { emptyPayroll } from './payroll.models';

describe('Finance area navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage',
            component: ManagementLayout,
            children: [
              { path: 'payroll', pathMatch: 'full', redirectTo: 'finance/payroll' },
              { path: 'finance', pathMatch: 'full', redirectTo: 'finance/overview' },
              { path: 'finance/:area', component: Payroll },
            ],
          },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('separates the area views, follows real links and retains legacy payroll links', async () => {
    const harness = await RouterTestingHarness.create('/manage/finance');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Finance overview');
    const payrollLink = Array.from(
      harness.routeNativeElement!.querySelectorAll<HTMLAnchorElement>(
        '.app-sidebar a[data-finance-area]',
      ),
    ).find((link) => link.textContent?.includes('Payroll'))!;
    payrollLink.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/finance/payroll');
    expect(
      harness.routeNativeElement?.querySelectorAll('.app-sidebar a[data-finance-area].active'),
    ).toHaveLength(1);
    expect(
      harness.routeNativeElement
        ?.querySelector('.app-sidebar a[data-finance-area="payroll"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    expect(harness.routeNativeElement?.querySelector('.finance-area-nav')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Payroll');
    expect(
      harness.routeNativeElement?.querySelector('nav[aria-label="Payroll sections"]')?.textContent,
    ).toContain('Pay settings');
    expect(harness.routeNativeElement?.querySelector('nav[aria-label="Invoice views"]')).toBeNull();
    await harness.navigateByUrl('/manage/finance/billing?view=Contractors');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Billing & payments');
    expect(
      harness.routeNativeElement?.querySelector('.payroll-register-heading h2')?.textContent,
    ).toBe('Contractors');
    expect(harness.routeNativeElement?.querySelector('nav[aria-label="Payroll views"]')).toBeNull();
    await harness.navigateByUrl('/manage/payroll');
    expect(TestBed.inject(Router).url).toBe('/manage/finance/payroll');
    expect(
      harness.routeNativeElement?.querySelector('nav[aria-label="Payroll views"]'),
    ).not.toBeNull();
  });

  it('restores deep-linked views and review records without moving or changing company data', async () => {
    const store = TestBed.inject(ManagementStore);
    const payroll = emptyPayroll();
    payroll.runs.push({
      id: 'run',
      name: 'October pay run',
      start: '2026-10-01',
      end: '2026-10-31',
      payday: '2026-10-31',
      cutoff: '2026-10-30',
      frequency: 'Monthly',
      status: 'Draft',
      createdBy: DEMO_USER.id,
      lines: [],
      audit: [],
    });
    expect(store.savePayroll(payroll)).toBe(true);
    const before = structuredClone(store.data().payroll);
    const harness = await RouterTestingHarness.create(
      '/manage/finance/payroll?view=Payroll&kind=run&record=run',
    );
    expect(
      harness.routeNativeElement?.querySelector('#payroll-record-title')?.textContent?.trim(),
    ).toBe('Pay run review');
    expect(harness.routeNativeElement?.textContent).toContain('October pay run');
    await harness.navigateByUrl('/manage/finance/payroll?view=Payroll&payrollView=Staff%20pay');
    expect(
      harness.routeNativeElement
        ?.querySelector('.payroll-view-tabs button.active')
        ?.textContent?.trim(),
    ).toBe('Staff pay');
    await harness.navigateByUrl('/manage/finance/billing?view=Settings&invoiceView=Clients');
    expect(harness.routeNativeElement?.querySelector('cv-client-billing')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('#payroll-record-title')).toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Pay rules & allowances');
    expect(store.data().payroll).toEqual(before);
  });
});
