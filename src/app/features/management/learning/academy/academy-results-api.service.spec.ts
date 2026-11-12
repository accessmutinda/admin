import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import {
  AcademyResultsApi,
  ResultRecord,
  LearningRecord,
  ResultAttempt,
  ResultAssignment,
} from './academy-results-api.service';

const availability = {
  remaining: 2,
  readyAt: '',
  runningId: '',
  availableAt: '',
  dueAt: '',
  overdue: false,
  reason: '',
};
const person = {
  id: 'person',
  name: 'Jane Worker',
  email: 'jane@example.test',
  role: 'Care Worker',
  location: 'London',
  department: 'Care',
  status: 'Active',
};
const policy = { maxAttempts: 3, retakeWaitHours: 24, timeLimitMinutes: 30, showFeedback: true };
function record(id = 'attempt', version = 3): ResultRecord {
  const attempt: ResultAttempt = {
    id,
    company_id: 'company',
    version,
    etag: `"v${version}"`,
    assignmentId: 'assignment',
    personId: person.id,
    courseId: 'course',
    courseTitle: 'Safeguarding',
    courseVersion: 4,
    questions: [],
    answers: {},
    flags: [],
    startedAt: '2026-11-12T08:00:00Z',
    deadline: '2026-11-12T08:30:00Z',
    submittedAt: '2026-11-12T08:10:00Z',
    passMark: 80,
    showFeedback: true,
    feedbackPermitted: true,
    score: 0,
    passed: false,
    policy,
    availability,
  };
  const assignment: ResultAssignment = {
    id: 'assignment',
    company_id: 'company',
    etag: '"v1"',
    version: 1,
    personId: person.id,
    courseId: 'course',
    due: '2027-12-01',
    assignedAt: '2026-11-01T00:00:00Z',
    assignedBy: 'Training manager',
    recurrenceMonths: 0,
    completedLessonIds: ['lesson'],
    notes: {},
    positions: {},
    completedAt: '',
    archived: false,
    policySnapshot: policy,
    availability: { '': availability },
  };
  return {
    assets: [],
    attempt,
    assignment,
    history: [attempt],
    retakePlans: [],
    person,
    integrations: { available: false, reason: 'Not configured' },
  };
}
function learning(): LearningRecord {
  const r = record();
  return { assets: [], assignment: r.assignment, attempts: r.history, retakePlans: [], person };
}

describe('Academy results and retakes API', () => {
  const scope = signal('first'),
    companyId = signal('company'),
    allowed = signal(true);
  let request: ReturnType<typeof vi.fn>, api: AcademyResultsApi;
  beforeEach(() => {
    scope.set('first');
    companyId.set('company');
    allowed.set(true);
    request = vi.fn(async (path: string, body?: unknown) =>
      body
        ? record('attempt', 4)
        : {
            results: path.includes('/learning?') ? [learning()] : [record()],
            next: null,
            meta: { company_id: companyId(), person },
          },
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        { provide: ManagementStore, useValue: { companyId } },
        { provide: CompanyAccessService, useValue: { can: () => allowed() } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademyResultsApi);
  });
  it('uses the saved due-soon window for learner records and clears it with access', async () => {
    request.mockResolvedValueOnce({results:[learning()], next:null, meta:{company_id:'company',person,dueSoonDays:47}});
    await api.load(true);
    expect(api.dueSoonDays()).toBe(47);
    allowed.set(false);
    expect(api.dueSoonDays()).toBeNull();
  });
  it('loads server results, identities, histories and policy inputs', async () => {
    await api.load();
    expect(api.attempts()[0].score).toBe(0);
    expect(api.people()[0].name).toBe('Jane Worker');
    expect(api.assignments()[0].policySnapshot?.maxAttempts).toBe(3);
    expect(api.me()).toBeUndefined();
    expect(request.mock.calls[0][0]).toContain('/academy/results?page=1&page_size=100');
  });
  it('loads every authorised page and deduplicates history by source version', async () => {
    request.mockResolvedValueOnce({
      results: [record('old', 2)],
      next: 2,
      meta: { company_id: 'company' },
    });
    const newest = record('new', 4);
    newest.history.push({ ...record('old', 3).attempt });
    request.mockResolvedValueOnce({
      results: [newest],
      next: null,
      meta: { company_id: 'company' },
    });
    await api.load();
    expect(api.attempts()).toHaveLength(2);
    expect(api.attempts().find((a) => a.id === 'old')?.version).toBe(3);
  });
  it('uses the server staff link even when there are no assignments', async () => {
    request.mockResolvedValueOnce({
      results: [],
      next: null,
      meta: { company_id: 'company', person },
    });
    await api.load(true);
    expect(api.me()?.id).toBe('person');
    expect(api.attempts()).toEqual([]);
  });
  it('sends If-Match and an idempotency key for a retake schedule', async () => {
    await api.load();
    await api.schedule('attempt', '2027-12-01T12:00:00Z');
    const call = request.mock.calls.find(([, body]) => body)! as unknown[];
    expect(call[0]).toBe('/companies/company/academy/results/attempt/schedule-retake');
    expect(call[1]).toEqual({ scheduledFor: '2027-12-01T12:00:00Z' });
    expect(call[3]).toMatchObject({ 'If-Match': '"v3"' });
    expect((call[3] as Record<string, string>)['Idempotency-Key']).toBeTruthy();
    expect(api.attempts()[0].version).toBe(4);
  });
  it('freezes responses and prevents overlapping writes', async () => {
    await api.load(true);
    let resolve!: (r: ResultRecord) => void;
    request.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    const values = ['wrong'];
    const pending = api.answer('attempt', 'question', values, false);
    values.push('later');
    expect(api.saving()).toBe(true);
    await expect(api.submit('attempt')).rejects.toThrow(/already saving/);
    expect(request.mock.calls.find(([, body]) => body)?.[1]).toEqual({
      questionId: 'question',
      answers: ['wrong'],
      flagged: false,
    });
    resolve(record());
    await pending;
    expect(api.saving()).toBe(false);
  });
  it('uses the same idempotency key after a connection failure', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection lost'));
    await expect(api.notify('attempt')).rejects.toThrow('Connection lost');
    const first = request.mock.calls.find(([, body]) => body) as unknown as unknown[];
    await api.load();
    await api.notify('attempt');
    const last = request.mock.calls.filter(([, body]) => body).at(-1) as unknown as unknown[];
    expect(last[3]).toEqual(first[3]);
  });
  it('refreshes stale results before allowing another decision', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Stale result'), { status: 412 }));
    request.mockResolvedValueOnce({
      results: [record('attempt', 6)],
      next: null,
      meta: { company_id: 'company' },
    });
    await expect(api.notify('attempt')).rejects.toThrow('Stale result');
    expect(api.attempts()[0].version).toBe(6);
    expect(api.error()).toBe('');
  });
  it('clears data after access denial and immediately hides a changed workspace', async () => {
    await api.load();
    scope.set('changed');
    expect(api.attempts()).toEqual([]);
    expect(api.people()).toEqual([]);
    TestBed.tick();
    scope.set('first');
    expect(api.attempts()).toEqual([]);
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access denied'), { status: 403 }));
    await expect(api.notify('attempt')).rejects.toThrow('Access denied');
    expect(api.attempts()).toEqual([]);
    expect(api.error()).toBe('Access denied');
  });
  it('rejects foreign company responses without exposing their records', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'foreign' },
    });
    await expect(api.load()).rejects.toThrow(/workspace mismatch/);
    expect(api.attempts()).toEqual([]);
  });
  it('retains the latest schedule and all groups when a result is updated', async () => {
    const initial = record();
    initial.retakePlans = [
      {
        id: 'old-plan',
        assignmentId: 'assignment',
        personId: 'person',
        fromAttemptId: 'attempt',
        groupId: '',
        scheduledFor: '2027-11-01T00:00:00Z',
        createdAt: '',
        createdBy: '',
        updatedAt: '',
        notifiedAt: '',
      },
    ];
    request.mockResolvedValueOnce({
      results: [initial, { ...initial, attempt: { ...initial.attempt, id: 'checkpoint' } }],
      next: null,
      meta: { company_id: 'company' },
    });
    await api.load();
    const changed = record('attempt', 4);
    changed.history.push({ ...changed.attempt, id: 'checkpoint', groupId: 'group' });
    changed.retakePlans = [{ ...initial.retakePlans[0], id: 'new-plan' }];
    request.mockResolvedValueOnce(changed);
    await api.schedule('attempt', '2027-12-01T00:00:00Z');
    expect(api.retakes().map((p) => p.id)).toEqual(['new-plan']);
    expect(api.attempts().some((a) => a.groupId === 'group')).toBe(true);
  });
});
