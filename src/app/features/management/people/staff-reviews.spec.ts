import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffReviewsApi } from './staff-reviews-api.service';
import { HrTeam } from './hr-team';
import { HrService } from './hr.service';
import { StaffProfile } from './staff-profile';
import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { newStaff } from './hr.models';
import type { StaffReview } from './staff-reviews.generated';
function row(status = 'Scheduled'): StaffReview {
  return {
    id: 'review-1',
    version: 1,
    etag: '"v1"',
    personId: 'staff-1',
    person: 'Alex Worker',
    type_id: 'type-1',
    type: 'Supervision',
    date: '2026-11-10',
    assessor: 'Clinical assessor',
    assessor_id: null,
    status,
    discussion: 'Observed practice.',
    outcome: 'Development agreed.',
    competencies: [],
    completedAt: status === 'Completed' ? '2026-11-10T12:00:00Z' : null,
    completed_by: status === 'Completed' ? 'Manager' : null,
    correction_of: null,
    can_complete: status === 'Scheduled',
    overdue: false,
  };
}
function page() {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [row()],
    meta: {
      company_id: 'north',
      local_date: '2026-11-10',
      page: 1,
      page_size: 100,
      as_of: '2026-11-10T12:00:00Z',
      request_id: 'req',
      filters: {},
    },
  };
}
function profile() {
  const p = newStaff();
  p.id = 'staff-1';
  p.name = 'Alex Worker';
  p.role = 'Care Worker';
  p.location = 'North';
  p.start = '2026-11-01';
  p.hr!.personal.firstName = 'Alex';
  p.hr!.personal.surname = 'Worker';
  return {
    company_id: 'north',
    version: 1,
    etag: '"v1"',
    person: p,
    local_date: '2026-11-10',
    courses: [],
    readiness: {
      ready: false,
      missing: [],
      completed: 0,
      total: 0,
      next_task: null,
      next_section: 'reviews',
      tasks: [],
    },
    capabilities: { edit: true, approve: true, personal: false },
    review_types: [{ id: 'type-1', title: 'Supervision', requires_rating: false }],
    review_dimensions: [],
  };
}
describe('Connected supervision and appraisals', () => {
  let company: ReturnType<typeof signal<string>>,
    request: ReturnType<typeof vi.fn>,
    localSave: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    company = signal('north');
    request = vi.fn().mockResolvedValue(page());
    localSave = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/reviews', component: HrTeam, data: { section: 'reviews' } },
          {
            path: 'manage/people/staff/:id/reviews',
            component: StaffProfile,
            data: { staffSection: 'reviews' },
          },
        ]),
        { provide: AuthService, useValue: { profile: () => ({ id: 'actor' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => ({ revision: 1 }),
            can: () => true,
            canPath: () => true,
          },
        },
        {
          provide: HrService,
          useValue: {
            store: {
              company: () => ({ name: 'North' }),
              companyId: company,
              data: () => {
                throw Error('Browser HR records must not be read');
              },
            },
            staff: () => {
              throw Error('Browser staff must not be read');
            },
            related: localSave,
            auth: { currentUser: () => ({ name: 'Manager' }) },
            can: () => true,
            canPay: () => false,
          },
        },
      ],
    });
  });
  it('loads actual team reviews and puts Add Review at the top without the old inline panel', async () => {
    const harness = await RouterTestingHarness.create('/manage/reviews');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(request.mock.calls[0][0]).toContain('/companies/north/staff-reviews?');
    expect(harness.routeNativeElement!.textContent).toContain('Alex Worker');
    expect(harness.routeNativeElement!.textContent).not.toContain('Schedule or record a review');
    expect(harness.routeNativeElement!.querySelector('.hr-heading button')!.textContent).toContain(
      'Add Review',
    );
    expect(
      harness.routeNativeElement!.querySelector('a[href="/manage/people/staff/staff-1/reviews"]'),
    ).not.toBeNull();
  });
  it('opens the popup, saves a review and records completion through the protected command', async () => {
    request.mockImplementation((path: string) => {
      if (path.includes('/hr/review-options'))
        return Promise.resolve({
          next: null,
          results: [{ id: 'staff-1', name: 'Alex Worker', branch: 'North', reference: 'STAFF-1' }],
          meta: {
            ...page().meta,
            types: [{ id: 'type-1', title: 'Supervision', requires_rating: false }],
            dimensions: [],
            can_complete: true,
          },
        });
      if (path.endsWith('/complete'))
        return Promise.resolve({ ...row('Completed'), version: 2, etag: '"v2"' });
      if (path.endsWith('/staff-reviews')) return Promise.resolve(row());
      return Promise.resolve(page());
    });
    const harness = await RouterTestingHarness.create('/manage/reviews');
    await harness.fixture.whenStable();
    harness.detectChanges();
    (harness.routeNativeElement!.querySelector('.hr-heading button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    const dialog = TestBed.inject(MatDialog).openDialogs[0];
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const form = dialog.componentInstance as unknown as {
      staffId: string;
      typeId: string;
      date: string;
      assessor: string;
      recordCompleted: boolean;
      discussion: string;
      outcome: string;
      save(): Promise<void>;
    };
    Object.assign(form, {
      staffId: 'staff-1',
      typeId: 'type-1',
      date: '2026-11-10',
      assessor: 'Clinical assessor',
      recordCompleted: true,
      discussion: 'Observed practice.',
      outcome: 'Development agreed.',
    });
    await form.save();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement!.textContent).toContain('Completed review recorded.');
    });
    const created = request.mock.calls.find(
      (call) => call[0] === '/companies/north/staff-reviews',
    )!;
    expect(created[1]).toMatchObject({
      staff_id: 'staff-1',
      type_id: 'type-1',
      assessor: 'Clinical assessor',
    });
    expect(created[1]).not.toHaveProperty('status');
    const completion = request.mock.calls.find((call) => call[0].endsWith('/review-1/complete'))!;
    expect(completion[3]['If-Match']).toBe('"v1"');
    expect(completion[1]).not.toHaveProperty('completed_by');
    expect(localSave).not.toHaveBeenCalled();
  });
  it('uses the existing staff review completion controls and renders the saved history', async () => {
    let completed = false;
    request.mockImplementation((path: string) => {
      if (path.endsWith('/profile')) return Promise.resolve(profile());
      if (path.endsWith('/complete')) {
        completed = true;
        return Promise.resolve({ ...row('Completed'), version: 2, etag: '"v2"' });
      }
      const result = page();
      result.results = [row(completed ? 'Completed' : 'Scheduled')];
      return Promise.resolve(result);
    });
    const harness = await RouterTestingHarness.create('/manage/people/staff/staff-1/reviews');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const textareas = harness.routeNativeElement!.querySelectorAll<HTMLTextAreaElement>('textarea');
    textareas[0].value = 'Practice observed and discussed.';
    textareas[1].value = 'Follow-up agreed.';
    const button = [...harness.routeNativeElement!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Save Completed Review'),
    )!;
    button.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(completed).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Completed review saved and locked.');
    expect(localSave).not.toHaveBeenCalled();
  });
  it('keeps completion retries on the original revision and idempotency identity', async () => {
    const api = TestBed.inject(StaffReviewsApi);
    TestBed.tick();
    const body = { discussion: 'Observed.', outcome: 'Agreed.', reason: 'Recorded review' };
    request
      .mockRejectedValueOnce(Error('Network interrupted'))
      .mockResolvedValueOnce(row('Completed'));
    await expect(api.complete(row(), body)).rejects.toThrow('interrupted');
    await api.complete(row(), body);
    expect(request.mock.calls[0][3]['Idempotency-Key']).toBe(
      request.mock.calls[1][3]['Idempotency-Key'],
    );
    expect(request.mock.calls[0][3]['If-Match']).toBe('"v1"');
  });
  it('clears failed and stale reads without a browser or seeded fallback', async () => {
    const api = TestBed.inject(StaffReviewsApi);
    TestBed.tick();
    await api.load();
    expect(api.loaded()).toBe(true);
    request.mockRejectedValue(Error('Review history unavailable'));
    await api.load();
    expect(api.rows()).toEqual([]);
    expect(api.loaded()).toBe(false);
    expect(api.error()).toContain('unavailable');
    let resolve!: (value: ReturnType<typeof page>) => void;
    request.mockImplementation(() => new Promise((r) => (resolve = r)));
    const pending = api.load();
    company.set('south');
    resolve(page());
    await pending;
    expect(api.rows()).toEqual([]);
  });
  it('routes shared staff entries to performance authority and leaves actors to the backend', async () => {
    const api = TestBed.inject(OnboardingStaffApi);
    api.area.set('performance');
    TestBed.tick();
    request.mockResolvedValue(profile());
    await api.load('staff-1');
    const before = api.person()!,
      after = structuredClone(before);
    after.hr.notes.push({
      id: 'temporary',
      at: '2026-11-10',
      author: 'Untrusted author',
      text: 'Reflection from supervision',
      reflective: true,
    });
    await api.commit(before, after);
    const [path, body] = request.mock.calls.at(-1)!;
    expect(path).toBe('/companies/north/staff/staff-1/workforce-reviews/entries');
    expect(body).toEqual({ kind: 'note', title: 'Reflection from supervision', reflective: true });
  });
});
