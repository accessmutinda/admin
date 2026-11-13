import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import { AcademyRefreshersApi } from './academy-refreshers-api.service';

describe('Required refreshers staff sources', () => {
  let api: AcademyRefreshersApi, request: ReturnType<typeof vi.fn>;
  const actor = signal({ id: '12' }),
    company = signal('north'),
    allowed = signal(true);
  const data = () => ({
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    meta: { local_date: '2026-11-13', timezone: 'Europe/London', as_of: '2026-11-13T10:00:00Z' },
    assignment_ids: ['assignment'],
    certificate_ids: ['certificate'],
    assignments: [
      {
        id: 'assignment',
        course_id: 'course',
        course_version: 2,
        course_title: 'Pinned refresher title',
        cycle: 'Refresher',
        due: '2026-11-14',
        status: 'Due soon',
        can_continue: true,
        reason: '',
      },
    ],
    reviews: [
      {
        certificate_id: 'certificate',
        course_id: 'course',
        course_version: 1,
        course_title: 'Original course title',
        due: '2026-11-14',
        state: 'Current',
        reason: 'Refresher review required',
      },
    ],
  });
  beforeEach(() => {
    actor.set({ id: '12' });
    company.set('north');
    allowed.set(true);
    request = vi.fn(async () => data());
    TestBed.configureTestingModule({
      providers: [
        AcademyRefreshersApi,
        { provide: AuthService, useValue: { api: request, profile: actor } },
        { provide: CompanyAccessService, useValue: { companyId: company, can: () => allowed() } },
        {
          provide: AcademyApi,
          useValue: { scope: computed(() => `${actor().id}|${company()}|${allowed()}`) },
        },
        {
          provide: AcademyResultsApi,
          useValue: {
            me: () => ({ id: 'worker' }),
            assignments: () => [
              {
                id: 'assignment',
                personId: 'worker',
                courseId: 'course',
                courseVersion: 2,
                type: 'Refresher',
                due: '2026-11-14',
                archived: false,
                completedAt: '',
              },
            ],
          },
        },
        {
          provide: AcademyCertificatesApi,
          useValue: {
            certificates: () => [
              {
                id: 'certificate',
                personId: 'worker',
                courseId: 'course',
                courseVersion: 1,
                state: 'Current',
              },
            ],
          },
        },
      ],
    });
    api = TestBed.inject(AcademyRefreshersApi);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('uses server review dates and pinned titles for only the linked staff account', async () => {
    await api.load();
    expect(request).toHaveBeenCalledWith('/companies/north/academy/learning/refreshers');
    expect(api.snapshot()?.assignments[0].course_title).toBe('Pinned refresher title');
    expect(api.snapshot()?.reviews[0].due).toBe('2026-11-14');
  });
  it.each([
    { actor_id: '13' },
    { company_id: 'south' },
    { person_id: 'other' },
    { assignment_ids: [] },
    { certificate_ids: ['foreign'] },
    { assignments: [{ ...data().assignments[0], due: '2027-01-01' }] },
    { assignments: [{ ...data().assignments[0], course_version: 3 }] },
    { assignments: [data().assignments[0], data().assignments[0]] },
    { reviews: [{ ...data().reviews[0], certificate_id: 'foreign' }] },
    { reviews: [{ ...data().reviews[0], state: 'Revoked' }] },
    { reviews: [data().reviews[0], data().reviews[0]] },
  ])('rejects foreign or changed source records: %o', async (change) => {
    request.mockResolvedValue({ ...data(), ...change });
    await expect(api.load()).rejects.toThrow();
    expect(api.snapshot()).toBeNull();
  });
  it('clears data immediately on workspace, actor or access changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.snapshot()).toBeNull();
    actor.set({ id: '12' });
    company.set('south');
    expect(api.snapshot()).toBeNull();
    company.set('north');
    allowed.set(false);
    expect(api.snapshot()).toBeNull();
  });
  it('discards a response received after leaving the refresher page', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.load();
    api.clear();
    finish(data());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
  it('does not show stale records after an unavailable response', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection unavailable'));
    await expect(api.load()).rejects.toThrow('Connection unavailable');
    expect(api.snapshot()).toBeNull();
  });
});
