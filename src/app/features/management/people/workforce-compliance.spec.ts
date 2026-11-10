import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { WorkforceComplianceApi } from './workforce-compliance-api.service';
import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { HrCompliance } from './hr-compliance';
import { newStaff } from './hr.models';
import type { WorkforceCompliancePage } from './workforce-compliance.generated';

function page(): WorkforceCompliancePage {
  return {
    count: 21,
    next: null,
    previous: null,
    results: [
      {
        key: 'staff-1:check-1',
        person: {
          id: 'staff-1',
          name: 'Alex Worker',
          role: 'Care Worker',
          location: 'North',
          hr: { reference: 'STAFF-001' },
        },
        check: {
          id: 'check-1',
          title: 'DBS check',
          status: 'Recorded',
          effectiveState: 'Needs evidence',
          completed: '',
          expiry: '',
          reviewer: '',
          documentId: '',
          note: '',
        },
        evidence: null,
        state: 'Needs evidence',
        review_section: 'compliance',
      },
    ],
    meta: {
      company_id: 'north',
      page: 1,
      page_size: 10,
      as_of: '2026-11-10T12:00:00Z',
      local_date: '2026-11-10',
      request_id: 'req-1',
      filters: {},
      counts: { not_started: 4, awaiting_review: 17, due_soon: 3, expired: 1 },
      branches: ['North'],
      types: ['DBS check'],
      unavailable_staff: 0,
    },
  };
}
describe('Workforce compliance integration', () => {
  let company: ReturnType<typeof signal<string>>, request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    company = signal('north');
    request = vi.fn().mockResolvedValue(page());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'manage/people/compliance', component: HrCompliance }]),
        { provide: AuthService, useValue: { profile: () => ({ id: 'actor-1' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: () => ({ version: 1 }), can: () => true },
        },
      ],
    });
  });
  it('connects the existing register, full-dataset counts, and review links', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/people/compliance?check=Awaiting%20review&q=Alex',
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(request.mock.calls[0][0]).toContain('/companies/north/hr/compliance?');
    expect(request.mock.calls[0][0]).toContain('q=Alex');
    expect(harness.routeNativeElement!.textContent).toContain('Alex Worker');
    expect(harness.routeNativeElement!.textContent).toContain('21 checks match');
    const link = [...harness.routeNativeElement!.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Review Check'),
    )!;
    expect(link.getAttribute('href')).toBe('/manage/people/staff/staff-1/compliance#check-check-1');
    expect(harness.routeNativeElement!.textContent).toContain('17');
  });
  it('asks the backend for the next page and preserves active filters', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/people/compliance?q=DBS&branch=North',
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    (
      harness.routeNativeElement!.querySelector(
        '[aria-label="Next check page"]',
      ) as HTMLButtonElement
    ).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const path = request.mock.calls.at(-1)![0];
    expect(path).toContain('page=2');
    expect(path).toContain('q=DBS');
    expect(path).toContain('branch=North');
  });
  it('shows an API error and clears previous rows without local fallback', async () => {
    const api = TestBed.inject(WorkforceComplianceApi);
    TestBed.tick();
    await api.load('check=all');
    expect(api.page()?.count).toBe(21);
    request.mockRejectedValue(new Error('Compliance unavailable'));
    await api.load('check=all');
    expect(api.page()).toBeNull();
    expect(api.error()).toContain('unavailable');
  });
  it('rejects responses that arrive after the workspace changes', async () => {
    let resolve!: (value: WorkforceCompliancePage) => void;
    request.mockImplementation(() => new Promise<WorkforceCompliancePage>((r) => (resolve = r)));
    const api = TestBed.inject(WorkforceComplianceApi);
    TestBed.tick();
    const loading = api.load('check=all');
    company.set('south');
    resolve(page());
    await loading;
    expect(api.page()).toBeNull();
  });
  it('exports the complete authorised filter through the backend endpoint', async () => {
    const api = TestBed.inject(WorkforceComplianceApi);
    TestBed.tick();
    request.mockResolvedValue(new Blob(['csv']));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export'),
      revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}),
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await api.export('q=DBS&check=Expired&page=2&page_size=10');
    expect(request.mock.calls.at(-1)![0]).toBe(
      '/companies/north/hr/compliance/export?q=DBS&check=Expired',
    );
    expect(click).toHaveBeenCalled();
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
  it('uses compliance-owned profile and check operations without sending reviewer or derived state', async () => {
    const person = newStaff();
    person.id = 'staff-1';
    person.hr!.checks = [
      {
        id: 'check-1',
        title: 'DBS check',
        status: 'Verified',
        completed: '2026-11-10',
        expiry: '',
        documentId: 'file-1',
        reviewer: 'Untrusted reviewer',
        note: 'Reviewed',
      },
    ];
    const profile = {
      company_id: 'north',
      version: 1,
      etag: '"v1"',
      person,
      local_date: '2026-11-10',
      readiness: {
        ready: false,
        missing: [],
        completed: 0,
        total: 1,
        next_task: null,
        next_section: 'compliance',
        tasks: [],
      },
      courses: [],
      capabilities: { edit: true, approve: true, personal: false },
    };
    const api = TestBed.inject(OnboardingStaffApi);
    api.area.set('compliance');
    TestBed.tick();
    request.mockResolvedValue(profile);
    await api.load('staff-1');
    expect(request.mock.calls.at(-1)![0]).toBe(
      '/companies/north/staff/staff-1/workforce-compliance/profile',
    );
    await api.save(api.person()!, 'compliance', '"v1"');
    const [path, body, , headers] = request.mock.calls.at(-1)!;
    expect(path).toBe('/companies/north/staff/staff-1/workforce-compliance/checks');
    expect(headers['If-Match']).toBe('"v1"');
    expect(body.checks[0]).not.toHaveProperty('reviewer');
    expect(body.checks[0]).not.toHaveProperty('effectiveState');
  });
});
