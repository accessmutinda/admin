import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyMyCoursesApi } from './academy-my-courses-api.service';

describe('My courses staff catalogue', () => {
  let api: AcademyMyCoursesApi;
  const company = signal('north'),
    actor = signal({ id: '12' }),
    allowed = signal(true);
  let request: ReturnType<typeof vi.fn<(path: string, ...args: any[]) => Promise<any>>>;
  const catalogue = () => ({
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    allow_self_enrolment: true,
    results: [
      {
        course: {
          id: 'assigned',
          company_id: 'north',
          title: 'Assigned learning',
          version: 2,
          etag: '"v2"',
        },
        assignment_id: 'assignment',
        assets: [],
        can_enrol: false,
      },
      {
        course: { id: 'optional', company_id: 'north', title: 'Optional learning', etag: '"v3"' },
        assignment_id: null,
        assets: [{ id: 'image', company_id: 'north' }],
        can_enrol: true,
      },
    ],
  });
  beforeEach(() => {
    company.set('north');
    actor.set({ id: '12' });
    allowed.set(true);
    request = vi.fn(async (path: string) =>
      path.endsWith('/enrol') ? { assignment_id: 'new-assignment' } : catalogue(),
    );
    TestBed.configureTestingModule({
      providers: [
        AcademyMyCoursesApi,
        { provide: AuthService, useValue: { api: request, profile: actor } },
        { provide: CompanyAccessService, useValue: { companyId: company, can: () => allowed() } },
        {
          provide: AcademyApi,
          useValue: { scope: computed(() => `${company()}|${actor().id}|${allowed()}`) },
        },
        {
          provide: AcademyResultsApi,
          useValue: {
            me: () => ({ id: 'worker' }),
            assignments: () => [
              {
                id: 'assignment',
                personId: 'worker',
                courseId: 'assigned',
                courseVersion: 2,
                archived: false,
              },
            ],
          },
        },
      ],
    });
    api = TestBed.inject(AcademyMyCoursesApi);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('loads only the signed-in learner catalogue and accepts own assignment links', async () => {
    await api.load();
    expect(api.courses().map((c) => c.id)).toEqual(['assigned', 'optional']);
    expect(request).toHaveBeenCalledWith('/companies/north/academy/learning/courses');
    expect(api.canEnrol('assigned')).toBe(false);
    expect(api.canEnrol('optional')).toBe(true);
  });
  it.each([
    { actor_id: '13' },
    { person_id: 'other-worker' },
    { company_id: 'south' },
    { results: [{ ...catalogue().results[0], assignment_id: 'foreign-assignment' }] },
  ])('rejects foreign or outdated course context: %o', async (change) => {
    request.mockResolvedValue({ ...catalogue(), ...change });
    await expect(api.load()).rejects.toThrow();
    expect(api.courses()).toEqual([]);
  });
  it.each([
    { results: [catalogue().results[1]] },
    {
      results: [
        {
          ...catalogue().results[0],
          course: { ...catalogue().results[0].course, id: 'different-course' },
        },
      ],
    },
    {
      results: [
        { ...catalogue().results[0], course: { ...catalogue().results[0].course, version: 3 } },
      ],
    },
    { results: [catalogue().results[0], catalogue().results[0]] },
  ])('rejects missing, duplicated, or mismatched assignment revisions: %o', async (change) => {
    request.mockResolvedValue({ ...catalogue(), ...change });
    await expect(api.load()).rejects.toThrow('assignments changed');
    expect(api.courses()).toEqual([]);
  });
  it('keeps a newly loaded catalogue when an older enrolment fails after switching accounts', async () => {
    await api.load();
    let reject!: (error: unknown) => void;
    request.mockImplementationOnce(() => new Promise((_, fail) => (reject = fail)));
    const enrolment = api.enrol('optional');
    actor.set({ id: '13' });
    request.mockResolvedValue({ ...catalogue(), actor_id: '13' });
    await api.load();
    reject(new Error('Old enrolment response'));
    await expect(enrolment).rejects.toThrow('Old enrolment response');
    expect(api.snapshot()?.actor_id).toBe('13');
    expect(api.courses()).toHaveLength(2);
  });
  it('posts no person or company selectors and pins the reviewed revision', async () => {
    await api.load();
    await api.enrol('optional');
    expect(request).toHaveBeenLastCalledWith(
      '/companies/north/academy/learning/courses/optional/enrol',
      {},
      'POST',
      { 'If-Match': '"v3"', 'Idempotency-Key': expect.any(String) },
    );
  });
  it('reuses the enrolment key when retrying an uncertain network response', async () => {
    await api.load();
    request.mockRejectedValueOnce(new Error('Connection lost'));
    await expect(api.enrol('optional')).rejects.toThrow('Connection lost');
    const first = request.mock.calls.at(-1)![3];
    await api.load();
    await api.enrol('optional');
    expect(request.mock.calls.at(-1)![3]).toEqual(first);
  });
  it('discards an old catalogue when the logged-in account changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.courses()).toEqual([]);
    expect(api.assets()).toEqual([]);
    expect(api.canEnrol('optional')).toBe(false);
  });
  it('discards a late catalogue response after the page is stopped', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.load();
    api.clear();
    finish(catalogue());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
  it('clears previously loaded courses after access is revoked', async () => {
    await api.load();
    allowed.set(false);
    expect(api.snapshot()).toBeNull();
    await expect(api.enrol('optional')).rejects.toThrow('unavailable');
  });
  it('fetches only media belonging to an authorised catalogue entry', async () => {
    await api.load();
    await api.blob('image');
    expect(request).toHaveBeenLastCalledWith(
      '/companies/north/academy/learning/courses/optional/media/image/content',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    await expect(api.blob('foreign-image')).rejects.toThrow('unavailable');
  });
});
