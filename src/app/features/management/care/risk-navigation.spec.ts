import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { seedCareDemo } from '../../../demo/care-demo';
import { ManagementLayout } from '../layout/management-layout';
import { ServiceUserDirectory } from './service-user-directory';
import { RiskAssessments } from './risk-assessments';
import { CareService } from './care.service';

describe('Risk assessment directory access', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage',
            component: ManagementLayout,
            children: [
              { path: 'clients', component: ServiceUserDirectory },
              { path: 'clients/:id/risks', component: RiskAssessments },
            ],
          },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
    TestBed.inject(ManagementStore).saveWorkspace((data) => seedCareDemo(data));
  });
  it('keeps risk assessments accessible without a dedicated main sidebar item', async () => {
    const harness = await RouterTestingHarness.create('/manage/clients?open=risks');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(
      Array.from(root.querySelectorAll<HTMLAnchorElement>('.app-sidebar a')).some((link) =>
        link.textContent?.includes('Risk Assessments'),
      ),
    ).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/manage/clients?open=risks');
    expect(root.textContent).toContain('Select a service user below');
    const personLink = root.querySelector<HTMLAnchorElement>(
      '.directory-results a[href="/manage/clients/care-demo-client-0/risks"]',
    )!;
    expect(personLink).toBeTruthy();
    const destination = personLink.getAttribute('href');
    personLink.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(destination);
    expect(root.textContent).toContain('Risk Assessment Overview');
    expect(root.textContent).not.toContain('Preview mockups');
    const clientId = destination!.split('/')[3];
    const care = TestBed.inject(CareService);
    expect(care.client(clientId)!.file!.riskRegister!.assessments.length).toBeGreaterThanOrEqual(8);
    const reviewRow = Array.from(
      root.querySelectorAll<HTMLTableRowElement>('.risk-workspace tbody tr'),
    ).find((row) => row.textContent?.includes('In review'))!;
    expect(reviewRow).toBeTruthy();
    reviewRow.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const reason = root.querySelector<HTMLInputElement>('.assessment-footer .reason input')!;
    reason.value = 'Controls and instructions reviewed';
    reason.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    Array.from(root.querySelectorAll<HTMLButtonElement>('.assessment-footer button'))
      .find((button) => button.textContent?.includes('Approve Assessment'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const approvedReview = care
      .client(clientId)!
      .file!.riskRegister!.assessments.find((r) => r.version === 2)!;
    expect(approvedReview.status).toBe('Approved');
    expect(approvedReview.approver).toBe(DEMO_USER.name);
    await harness.navigateByUrl(destination!);
    harness.detectChanges();
    expect(care.client(clientId)!.file!.riskRegister!.history.at(-1)!.reason).toBe(
      'Controls and instructions reviewed',
    );
    const serviceUsers = root.querySelector<HTMLAnchorElement>(
      '.app-sidebar a[href="/manage/clients"]',
    )!;
    expect(serviceUsers.classList.contains('active')).toBe(true);
    serviceUsers.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.querySelector('.directory-results a[href$="/risks"]')).toBeNull();
  });
});
