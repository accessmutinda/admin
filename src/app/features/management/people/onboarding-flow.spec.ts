import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { OnboardingApi } from './onboarding-api.service';
import { HrOnboarding } from './hr-onboarding';
import { HrService } from './hr.service';
import { newStaff } from './hr.models';
import type { StaffOnboarding } from './onboarding.generated';

function response(company = 'north', ready = false): StaffOnboarding {
  const person = newStaff();
  Object.assign(person, {
    id: 'staff-1',
    name: 'Test Starter',
    email: 'starter@example.org',
    stage: 'Hired',
  });
  return {
    company_id: company,
    version: 3,
    etag: '"v3"',
    person,
    readiness: {
      ready,
      missing: ready ? [] : ['DBS check'],
      completed: ready ? 3 : 2,
      total: 3,
      next_task: ready ? null : 'DBS check',
      next_section: 'compliance',
      tasks: [],
    },
    courses: [],
    local_date: '2026-11-10',
    capabilities: { edit: true, approve: true, personal: true },
  };
}
function queue(ready = false) {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'staff-1',
        kind: 'starter',
        source_id: 'application-1',
        name: 'Test Starter',
        email: 'starter@example.org',
        reference: 'CV-1',
        branch: 'North',
        start_date: '2026-11-10',
        step: null,
        saved_at: null,
        manager: null,
        completed: ready ? 3 : 2,
        total: 3,
        ready,
        next_task: ready ? null : 'DBS check',
        next_section: 'compliance',
        etag: '"v3"',
      },
    ],
    meta: {
      company_id: 'north',
      counts: { drafts: 0, in_progress: ready ? 0 : 1, ready: ready ? 1 : 0 },
      branches: ['North'],
      unavailable: { readiness: null, drafts: null },
    },
  };
}
describe('Connected staff onboarding', () => {
  const company = signal('north'),
    enabled = signal(true),
    revision = signal(1),
    request = vi.fn();
  beforeEach(() => {
    company.set('north');
    enabled.set(true);
    revision.set(1);
    request.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'manage/people/onboarding', component: HrOnboarding }]),
        { provide: AuthService, useValue: { profile: () => ({ id: 'user-1' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => ({ revision: revision(), enabled: enabled() }),
            can: () => enabled(),
            canPath: () => enabled(),
          },
        },
        { provide: HrService, useValue: { can: () => true } },
      ],
    });
  });
  it('loads the server profile and sends check facts without browser reviewers or calculated fields', async () => {
    request.mockResolvedValue(response());
    const api = TestBed.inject(OnboardingStaffApi);
    TestBed.tick();
    await api.load('staff-1');
    const person = api.person()!;
    person.hr.checks = [
      {
        id: 'check-1',
        title: 'DBS check',
        status: 'Verified',
        completed: '2026-11-10',
        expiry: '',
        documentId: 'file-1',
        note: 'Reviewed',
        reviewer: 'Forged reviewer',
      },
    ];
    await api.save(person, 'compliance', '"v3"');
    const [path, body, method, headers] = request.mock.calls.at(-1)!;
    expect(path).toBe('/companies/north/staff/staff-1/compliance');
    expect(method).toBe('PATCH');
    expect(headers).toEqual({ 'If-Match': '"v3"' });
    expect(body).toEqual({
      checks: [
        {
          id: 'check-1',
          status: 'Verified',
          completed: '2026-11-10',
          expiry: null,
          documentId: 'file-1',
          note: 'Reviewed',
        },
      ],
    });
  });
  it('clears profiles on company and access changes and ignores late responses', async () => {
    const api = TestBed.inject(OnboardingStaffApi);
    TestBed.tick();
    let finish!: (value: StaffOnboarding) => void;
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const loading = api.load('staff-1');
    company.set('south');
    TestBed.tick();
    finish(response());
    await loading;
    expect(api.person()).toBeNull();
    request.mockResolvedValue(response('south'));
    await api.load('staff-1');
    expect(api.person()?.id).toBe('staff-1');
    enabled.set(false);
    TestBed.tick();
    expect(api.person()).toBeNull();
  });
  it('retains retry identity and the queue version when submitting activation', async () => {
    const api = TestBed.inject(OnboardingStaffApi);
    TestBed.tick();
    request.mockResolvedValue(response('north', true));
    await api.load('staff-1');
    request.mockRejectedValue(new Error('Network unavailable'));
    await expect(api.activate('staff-1', '"v3"')).rejects.toThrow('Network');
    const first = request.mock.calls.at(-1)!;
    await expect(api.activate('staff-1', '"v3"')).rejects.toThrow('Network');
    const retry = request.mock.calls.at(-1)!;
    expect(first[3]['Idempotency-Key']).toBe(retry[3]['Idempotency-Key']);
    expect(retry[3]['If-Match']).toBe('"v3"');
    expect(retry[1].effective_date).toBe('2026-11-10');
    expect(retry[1]).not.toHaveProperty('ready');
  });
  it('links the existing Continue Checklist action to the staff evidence editor', async () => {
    request.mockResolvedValue(queue());
    const harness = await RouterTestingHarness.create('/manage/people/onboarding');
    await new Promise((resolve) => setTimeout(resolve, 200));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const link = [...harness.routeNativeElement!.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Continue Checklist'),
    )!;
    expect(link.getAttribute('href')).toBe('/manage/people/staff/staff-1/compliance');
    expect(link.getAttribute('aria-disabled')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('2 / 3 tasks');
  });
  it('activates from the existing queue button and reloads the authoritative queue', async () => {
    let activated = false;
    request.mockImplementation((path: string) => {
      if (path.endsWith('/profile')) return Promise.resolve(response('north', true));
      if (path.endsWith('/activate')) {
        activated = true;
        return Promise.resolve(response('north', true));
      }
      const result = queue(true);
      if (activated) {
        result.results = [];
        result.count = 0;
        result.meta.counts.ready = 0;
      }
      return Promise.resolve(result);
    });
    const harness = await RouterTestingHarness.create('/manage/people/onboarding?lane=ready');
    await new Promise((resolve) => setTimeout(resolve, 200));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const button = [...harness.routeNativeElement!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Complete Onboarding'),
    )!;
    button.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(activated).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Test Starter is now active.');
    expect(TestBed.inject(OnboardingApi).rows()).toHaveLength(0);
  });
  it('does not activate or invent progress after an API error', async () => {
    request.mockRejectedValue(new Error('Onboarding unavailable'));
    const service = TestBed.inject(OnboardingApi);
    TestBed.tick();
    await service.load('in-progress', '', '');
    expect(service.rows()).toEqual([]);
    expect(service.meta()).toBeNull();
    expect(service.error()).toContain('unavailable');
  });
  it('keeps canonical reference IDs and omits temporary IDs when creating references', async () => {
    const data = response();
    const api = TestBed.inject(OnboardingStaffApi);
    TestBed.tick();
    request.mockResolvedValue(data);
    await api.load('staff-1');
    api.person()!.hr.references = [
      {
        id: 'existing-reference',
        name: 'Existing referee',
        organisation: 'Employer',
        email: 'existing@example.org',
        status: 'Requested',
      },
    ];
    const draft = structuredClone(api.person()!);
    draft.hr.references.push({
      id: 'temporary-reference',
      name: 'New referee',
      organisation: 'Employer',
      email: 'new@example.org',
      status: 'Requested',
    });
    await api.save(draft, 'employment', '"v3"');
    const body = request.mock.calls.at(-1)![1];
    expect(body.references[0].id).toBe('existing-reference');
    expect(body.references[1]).not.toHaveProperty('id');
  });
  it('disables the existing checklist action when staff-record read access is missing', async () => {
    TestBed.overrideProvider(CompanyAccessService, {
      useValue: {
        companyId: company,
        context: () => ({ revision: 1 }),
        can: (_module: string, submodule: string) => submodule !== 'records',
        canPath: () => true,
      },
    });
    request.mockResolvedValue(queue(true));
    const harness = await RouterTestingHarness.create('/manage/people/onboarding?lane=ready');
    await new Promise((resolve) => setTimeout(resolve, 200));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      [...harness.routeNativeElement!.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Complete Onboarding'),
      ),
    ).toBe(false);
    const link = [...harness.routeNativeElement!.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('View Checklist'),
    )!;
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('href')).toBeNull();
  });
});
