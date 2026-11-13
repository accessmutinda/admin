import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import { AcademyTrainingRecordApi } from './academy-training-record-api.service';

describe('Staff training record sources', () => {
  let api: AcademyTrainingRecordApi,
    request: ReturnType<typeof vi.fn<(path: string) => Promise<any>>>;
  const actor = signal({ id: '12' }),
    company = signal('north'),
    allowed = signal(true);
  const record = () => ({
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    can_request_records: true,
    rows: [
      {
        id: 'assignment',
        course_id: 'course',
        course_version: 2,
        course_title: 'Original published title',
        cycle: 'Initial',
        archived: true,
        due: '2027-01-01',
        completed_at: '2026-11-13T12:00:00Z',
        attempt_id: 'attempt',
        result_label: 'Passed · 100%',
        result_action: 'result',
        result_reason: '',
        evidence_status: 'ROTA_REFRESH_PENDING',
        certificate_id: 'certificate',
        certificate_state: 'Current',
      },
    ],
    certificate_ids: ['certificate'],
    requests: [{ id: 'request', personId: 'worker', status: 'Requested', etag: '"v1"' }],
  });
  beforeEach(() => {
    actor.set({ id: '12' });
    company.set('north');
    allowed.set(true);
    request = vi.fn(async () => record());
    TestBed.configureTestingModule({
      providers: [
        AcademyTrainingRecordApi,
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
                archived: true,
                completedAt: '2026-11-13T12:00:00Z',
              },
            ],
            attempts: () => [
              {
                id: 'attempt',
                personId: 'worker',
                assignmentId: 'assignment',
                submittedAt: '2026-11-13T12:00:00Z',
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
                assignmentId: 'assignment',
                state: 'Current',
              },
            ],
            requests: () => [
              { id: 'request', personId: 'worker', status: 'Requested', etag: '"v1"' },
            ],
          },
        },
      ],
    });
    api = TestBed.inject(AcademyTrainingRecordApi);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('loads historical course versions, results, certificates and HR requests for one staff account', async () => {
    await api.load();
    expect(request).toHaveBeenCalledWith('/companies/north/academy/learning/training-record');
    expect(api.row('assignment')?.course_title).toBe('Original published title');
    expect(api.row('assignment')?.archived).toBe(true);
    expect(api.snapshot()?.requests[0].id).toBe('request');
  });
  it.each([
    { actor_id: '13' },
    { company_id: 'south' },
    { person_id: 'other-staff' },
    { rows: [] },
    { rows: [{ ...record().rows[0], course_version: 3 }] },
    { rows: [{ ...record().rows[0], attempt_id: 'foreign-attempt' }] },
    { rows: [{ ...record().rows[0], certificate_state: 'Revoked' }] },
    { certificate_ids: ['foreign-certificate'] },
    { requests: [] },
    { requests: [{ ...record().requests[0], status: 'Provided' }] },
  ])('rejects foreign or mismatched training sources: %o', async (change) => {
    request.mockResolvedValue({ ...record(), ...change });
    await expect(api.load()).rejects.toThrow();
    expect(api.snapshot()).toBeNull();
  });
  it('hides training records immediately when the actor or access changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.snapshot()).toBeNull();
    actor.set({ id: '12' });
    allowed.set(false);
    expect(api.snapshot()).toBeNull();
  });
  it('discards a late response after leaving Training record', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.load();
    api.clear();
    finish(record());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
});
