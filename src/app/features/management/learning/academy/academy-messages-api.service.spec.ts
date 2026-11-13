import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import { ACADEMY_LEARNER_ONLY } from './academy-learner-context';

const message = (version = 1) => ({
  id: 'message',
  company_id: 'north',
  version,
  etag: `"v${version}"`,
  assignmentId: 'assignment',
  personId: 'worker',
  channel: 'In-platform',
  title: 'Original published course',
  text: 'Review your assigned training.',
  status: version === 1 ? 'Queued' : 'Delivered',
  attempts: 0,
  nextAttemptAt: '',
  at: '2026-11-13T12:00:00Z',
  updatedAt: '2026-11-13T12:00:00Z',
  providerId: '',
  error: '',
  history: [],
  course_id: 'course',
  course_reason: '',
});
const page = (version = 1) => ({
  count: 1,
  next: null,
  previous: null,
  results: [message(version)],
  meta: {
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    can_acknowledge: true,
    as_of: '2026-11-13T12:00:00Z',
    request_id: 'read',
  },
});

describe('Staff training messages', () => {
  let api: AcademyGovernanceApi, request: ReturnType<typeof vi.fn>;
  const actor = signal({ id: '12' }),
    company = signal('north'),
    allowed = signal(true),
    create = signal(true);
  beforeEach(() => {
    actor.set({ id: '12' });
    company.set('north');
    allowed.set(true);
    create.set(true);
    request = vi.fn(async () => page());
    TestBed.configureTestingModule({
      providers: [
        { provide: ACADEMY_LEARNER_ONLY, useValue: true },
        AcademyGovernanceApi,
        { provide: AuthService, useValue: { api: request, profile: actor } },
        {
          provide: CompanyAccessService,
          useValue: {
            can: (_m: string, _s: string, a: string) => allowed() && (a !== 'create' || create()),
            invalidate: vi.fn(async () => {}),
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        {
          provide: AcademyApi,
          useValue: { scope: computed(() => `${actor().id}|${company()}|${allowed()}`) },
        },
        {
          provide: AcademyResultsApi,
          useValue: {
            me: () => ({ id: 'worker' }),
            assignments: () => [
              { id: 'assignment', personId: 'worker', courseId: 'course', archived: false },
            ],
          },
        },
      ],
    });
    api = TestBed.inject(AcademyGovernanceApi);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('loads the staff transport and original message without management requests', async () => {
    await api.load(true);
    expect(request).toHaveBeenCalledWith(
      '/companies/north/academy/learning/messages?page=1&page_size=100',
    );
    expect(api.messages()[0].title).toBe('Original published course');
    expect(api.canAcknowledge()).toBe(true);
    expect(api.available()).toBe(false);
  });
  it.each([
    { meta: { ...page().meta, actor_id: '13' } },
    { meta: { ...page().meta, person_id: 'other' } },
    { meta: { ...page().meta, company_id: 'south' } },
    { results: [{ ...message(), personId: 'other' }] },
    { results: [{ ...message(), company_id: 'south' }] },
    { results: [{ ...message(), assignmentId: 'foreign' }] },
    { results: [{ ...message(), course_id: 'foreign-course' }] },
    { results: [message(), message()] },
  ])('rejects foreign or mismatched message records: %o', async (change) => {
    request.mockResolvedValue({ ...page(), ...change });
    await expect(api.load(true)).rejects.toThrow();
    expect(api.messages()).toEqual([]);
  });
  it('loads all pages without silently truncating the inbox', async () => {
    request.mockImplementation(async (path: string) =>
      path.includes('page=1&')
        ? { ...page(), count: 2, next: 2 }
        : { ...page(), count: 2, results: [{ ...message(), id: 'second' }] },
    );
    await api.load(true);
    expect(api.messages().map((m) => m.id)).toEqual(['message', 'second']);
  });
  it('honours a server-side read-only acknowledgement permission', async () => {
    request.mockResolvedValue({ ...page(), meta: { ...page().meta, can_acknowledge: false } });
    await api.load(true);
    expect(api.messages()).toHaveLength(1);
    expect(api.canAcknowledge()).toBe(false);
  });
  it('acknowledges with version and retry headers and reloads the saved receipt', async () => {
    let saved = false;
    request.mockImplementation(async (_path: string, body?: unknown) =>
      body ? ((saved = true), message(2)) : page(saved ? 2 : 1),
    );
    await api.load(true);
    await api.acknowledge('message');
    expect(api.messages()[0].status).toBe('Delivered');
    expect(request).toHaveBeenCalledWith(
      '/companies/north/academy/learning/messages/message/acknowledge',
      {},
      'POST',
      { 'Idempotency-Key': expect.any(String), 'If-Match': '"v1"' },
    );
  });
  it('retains an unknown-outcome retry key after reloading the inbox', async () => {
    await api.load(true);
    request.mockRejectedValueOnce(Error('Connection interrupted'));
    await expect(api.acknowledge('message')).rejects.toThrow();
    await api.load(true);
    request.mockImplementation(async (_path: string, body?: unknown) =>
      body ? message(2) : page(2),
    );
    await api.acknowledge('message');
    const writes = request.mock.calls.filter((call) => call[2] === 'POST');
    expect(writes).toHaveLength(2);
    expect(writes[0][3]['Idempotency-Key']).toBe(writes[1][3]['Idempotency-Key']);
  });
  it('hides messages when scope changes or a refresh is denied', async () => {
    await api.load(true);
    company.set('south');
    expect(api.messages()).toEqual([]);
    company.set('north');
    TestBed.tick();
    await api.load(true);
    request.mockRejectedValueOnce(Object.assign(Error('Staff inactive'), { status: 403 }));
    await expect(api.load(true)).rejects.toThrow();
    expect(api.messages()).toEqual([]);
  });
  it.each([{ count: 2 }, { count: 0 }])(
    'rejects an incomplete inbox instead of accepting a misleading total: %o',
    async (change) => {
      request.mockResolvedValue({ ...page(), ...change });
      await expect(api.load(true)).rejects.toThrow('changed while loading');
      expect(api.messages()).toEqual([]);
    },
  );
  it('rejects a message count that changes between pages', async () => {
    request.mockImplementation(async (path: string) =>
      path.includes('page=1&')
        ? { ...page(), count: 2, next: 2 }
        : { ...page(), count: 3, results: [{ ...message(), id: 'second' }] },
    );
    await expect(api.load(true)).rejects.toThrow('changed while loading');
    expect(api.messages()).toEqual([]);
  });
});
