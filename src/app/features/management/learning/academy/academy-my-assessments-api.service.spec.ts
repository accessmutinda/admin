import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyMyAssessmentsApi } from './academy-my-assessments-api.service';

describe('My assessments staff records', () => {
  let api: AcademyMyAssessmentsApi;
  const actor = signal({ id: '12' }),
    company = signal('north'),
    allowed = signal(true);
  let request: ReturnType<typeof vi.fn<(path: string) => Promise<any>>>;
  const source = () => ({
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    can_start: true,
    can_edit: true,
    assignment_ids: ['assignment'],
    attempts: [
      {
        id: 'attempt',
        assignment_id: 'assignment',
        status: 'In progress',
        action: 'resume',
        reason: '',
      },
    ],
  });
  beforeEach(() => {
    actor.set({ id: '12' });
    company.set('north');
    allowed.set(true);
    request = vi.fn(async () => source());
    TestBed.configureTestingModule({
      providers: [
        AcademyMyAssessmentsApi,
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
            assignments: () => [{ id: 'assignment', personId: 'worker', archived: false }],
            attempts: () => [{ id: 'attempt', assignmentId: 'assignment', personId: 'worker' }],
          },
        },
      ],
    });
    api = TestBed.inject(AcademyMyAssessmentsApi);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('loads the staff assessment index and reuses its existing attempt and assignment IDs', async () => {
    await api.load();
    expect(request).toHaveBeenCalledWith('/companies/north/academy/learning/assessments');
    expect(api.attempt('attempt')?.action).toBe('resume');
  });
  it.each([
    { actor_id: '13' },
    { company_id: 'south' },
    { person_id: 'other-worker' },
    { assignment_ids: [] },
    { assignment_ids: ['assignment', 'assignment'] },
    { attempts: [] },
    { attempts: [{ ...source().attempts[0], assignment_id: 'other-assignment' }] },
  ])('rejects foreign or incomplete assessment context: %o', async (change) => {
    request.mockResolvedValue({ ...source(), ...change });
    await expect(api.load()).rejects.toThrow();
    expect(api.snapshot()).toBeNull();
  });
  it('rejects a newly submitted result when its loaded answers still describe an unfinished attempt', async () => {
    request.mockResolvedValue({
      ...source(),
      attempts: [{ ...source().attempts[0], status: '100% · Passed', action: 'result' }],
    });
    await expect(api.load()).rejects.toThrow('changed while loading');
    expect(api.snapshot()).toBeNull();
  });
  it('uses the server decision for an archived attempt rather than offering resume', async () => {
    request.mockResolvedValue({
      ...source(),
      attempts: [
        {
          ...source().attempts[0],
          status: 'Unavailable',
          action: 'unavailable',
          reason: 'This learning cycle is archived.',
        },
      ],
    });
    await api.load();
    expect(api.attempt('attempt')?.action).toBe('unavailable');
    expect(api.attempt('attempt')?.reason).toContain('archived');
  });
  it('hides records immediately after an account, company, or permission change', async () => {
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
  it('discards a late response after leaving the staff assessment page', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.load();
    api.clear();
    finish(source());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
});
