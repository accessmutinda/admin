import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import type {
  AcademyReviewRead,
  AcademyNotificationRead,
  AcademyGovernanceSummaryRead,
} from './academy.generated';
import { AcademyReview } from './academy-governance.models';

const review = (version = 1): AcademyReviewRead => ({
  id: 'review',
  company_id: 'company',
  version,
  etag: `"v${version}"`,
  assignmentId: 'assignment',
  attemptId: '',
  personId: 'person',
  ownerId: 'owner',
  due: '2027-12-01',
  reason: 'Learning support',
  actions: '',
  decision: '',
  kind: 'Remedial review',
  status: 'Open',
  resolvedAt: '',
});
const notification = (version = 1): AcademyNotificationRead => ({
  id: 'notice',
  company_id: 'company',
  version,
  etag: `"v${version}"`,
  assignmentId: 'assignment',
  personId: 'person',
  title: 'Course',
  text: 'Learning support message',
  channel: 'In-platform',
  status: version === 1 ? 'Queued' : 'Delivered',
  attempts: 0,
  nextAttemptAt: '',
  at: '2026-11-12T12:00:00Z',
  updatedAt: '2026-11-12T12:00:00Z',
  providerId: '',
  error: '',
  history: [],
});
const summary: AcademyGovernanceSummaryRead = {
  company_id: 'company',
  as_of: '2026-11-12T12:00:00Z',
  request_id: 'read',
  finalPassRate: '—',
  checkpointPassRate: '—',
  finalAttempts: 0,
  checkpointAttempts: 0,
  exceptions: null,
  exceptionsReason: 'Provider not configured',
  currency: '—',
  current: 0,
  applicable: 0,
  outstanding: 0,
};

describe('Persisted academy policies and reviews', () => {
  const scope = signal('first'),
    company = signal('company'),
    allowed = signal(true),
    actions = signal<Set<string> | null>(null);
  let api: AcademyGovernanceApi, request: ReturnType<typeof vi.fn>;
  const page = (results: unknown[] = [], next: number | null = null) => ({
    results,
    next,
    meta: { company_id: company() },
  });
  beforeEach(() => {
    scope.set('first');
    company.set('company');
    allowed.set(true);
    actions.set(null);
    request = vi.fn(async (path: string, body?: unknown) =>
      body
        ? review(2)
        : path.endsWith('/summary')
          ? summary
          : path.includes('/reviews?')
            ? page([review()])
            : path.includes('/notifications?')
              ? page([notification()])
              : page(),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            invalidate: vi.fn(async () => {}),
            can: (_module: string, _feature: string, action: string) =>
              allowed() && (!actions() || actions()!.has(action)),
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademyGovernanceApi);
    TestBed.tick();
  });
  it('loads all source pages and real KPI values atomically', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) =>
      path.includes('/reviews?')
        ? path.includes('page=1&')
          ? page([review()], 2)
          : page([{ ...review(), id: 'second' }])
        : handler(path, body),
    );
    await api.load();
    expect(api.data().reviews.length).toBe(2);
    expect(api.summary()?.exceptions).toBeNull();
  });
  it('does not publish partial data when one policy source fails', async () => {
    await api.load();
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (path.includes('/adjustments?')) throw Error('Source unavailable');
      return handler(path, body);
    });
    await expect(api.load()).rejects.toThrow('Source unavailable');
    expect(api.data().reviews).toEqual([]);
    expect(api.error()).toBe('Source unavailable');
  });
  it('saves a new review using server identity and no protected person or audit fields', async () => {
    const value = { ...review(), id: 'temporary' } as AcademyReview & {
      version?: number;
      etag?: string;
    };
    delete value.version;
    delete value.etag;
    await api.saveReview(value);
    const call = request.mock.calls.find(([path, body]) => path.endsWith('/reviews') && body)!;
    expect(call[1]).not.toHaveProperty('id');
    expect(call[1]).not.toHaveProperty('personId');
    expect(value.id).toBe('review');
    expect(value.version).toBe(2);
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('uses root versions and the named resolution command', async () => {
    await api.load();
    const value = {
      ...review(),
      status: 'Resolved',
      actions: 'Support completed',
      decision: 'Resolved after support',
    } as AcademyReview & { version: number; etag: string };
    await api.saveReview(value);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/review/resolve') && body,
    )!;
    expect(call[2]).toBe('POST');
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(call[1]).not.toHaveProperty('status');
  });
  it('retains a committed identity if refresh fails after saving', async () => {
    const value = { ...review(), id: 'temporary' } as AcademyReview & {
      version?: number;
      etag?: string;
    };
    delete value.version;
    delete value.etag;
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (!body) throw Error('Refresh unavailable');
      return handler(path, body);
    });
    await expect(api.saveReview(value)).rejects.toThrow('Refresh unavailable');
    expect(value.id).toBe('review');
    expect(value.version).toBe(2);
  });
  it('reuses an idempotency key after an uncertain create response', async () => {
    const value = { ...review(), id: 'temporary' } as AcademyReview & {
      version?: number;
      etag?: string;
    };
    delete value.version;
    delete value.etag;
    request.mockRejectedValueOnce(Error('Connection unavailable'));
    await expect(api.saveReview(value)).rejects.toThrow('Connection unavailable');
    await api.saveReview(value);
    const calls = request.mock.calls.filter(([path, body]) => path.endsWith('/reviews') && body);
    expect(calls.length).toBe(2);
    expect(calls[0][3]['Idempotency-Key']).toBe(calls[1][3]['Idempotency-Key']);
  });
  it('does not grant approval from read access', async () => {
    actions.set(new Set(['read']));
    await api.load();
    await expect(
      api.approveAdjustment({
        id: 'new',
        assignmentId: 'assignment',
        personId: 'person',
        extraMinutes: 15,
        untimed: false,
        reason: 'Approved support',
        expires: '2027-01-01',
        approvedAt: '',
        approvedBy: '',
      }),
    ).rejects.toThrow('Permission');
    expect(request.mock.calls.some(([, body]) => body)).toBe(false);
  });
  it('clears immediately when workspace changes and ignores an old success', async () => {
    let resolve!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.load();
    scope.set('second');
    company.set('other');
    TestBed.tick();
    resolve({ results: [review()], next: null, meta: { company_id: 'company' } });
    await expect(pending).rejects.toThrow();
    expect(api.data().reviews).toEqual([]);
    expect(api.error()).toBe('');
  });
  it('rejects a foreign tenant summary', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) =>
      path.endsWith('/summary') ? { ...summary, company_id: 'other' } : handler(path, body),
    );
    await expect(api.load()).rejects.toThrow('mismatch');
    expect(api.source()).toBeNull();
  });
  it('loads only the authenticated learner inbox and records its versioned acknowledgement', async () => {
    await api.load(true);
    expect(api.notifications()[0].id).toBe('notice');
    request.mockImplementation(async (path: string, body?: unknown) =>
      body ? notification(2) : page([notification(2)]),
    );
    await api.acknowledge('notice');
    const call = request.mock.calls.find(([path]) => path.endsWith('/notice/acknowledge'))!;
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(api.notifications()[0].status).toBe('Delivered');
  });
  it('rejects a repeated pagination link', async () => {
    request.mockResolvedValue(page([review()], 1));
    await expect(api.load()).rejects.toThrow('repeated');
    expect(api.source()).toBeNull();
  });
  it('clears records when read permission is revoked', async () => {
    await api.load();
    allowed.set(false);
    expect(api.source()).toBeNull();
    await expect(api.load()).rejects.toThrow('access changed');
  });
  it('retains an exhausted attempt as a pending review until a server record is saved', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    const pending = {
      ...review(),
      id: 'attempt',
      attemptId: 'attempt',
      ownerId: '',
      due: '',
      pending: true,
    } as Partial<AcademyReviewRead>;
    delete pending.version;
    delete pending.etag;
    request.mockImplementation(async (path: string, body?: unknown) =>
      path.includes('/pending-reviews?') ? page([pending]) : handler(path, body),
    );
    await api.load();
    expect(api.data().reviews.length).toBe(2);
    expect(api.data().reviews[0].attemptId).toBe('attempt');
    expect(api.data().reviews[0].version).toBeUndefined();
  });
  it('keeps governance available without an unrelated results read grant', async () => {
    const access = TestBed.inject(CompanyAccessService);
    vi.spyOn(access, 'can').mockImplementation(
      (module: string, feature?: string, action?: string) =>
        feature !== 'results' && allowed() && (action ?? 'read') === 'read',
    );
    scope.set('limited');
    await api.load();
    expect(api.available()).toBe(true);
    expect(api.canRead('reviews')).toBe(false);
    expect(
      request.mock.calls.some(
        ([path]) =>
          path.includes('/reviews?') ||
          path.includes('/pending-reviews?') ||
          path.endsWith('/summary'),
      ),
    ).toBe(false);
    expect(api.summary()).toBeNull();
    expect(request.mock.calls.some(([path]) => path.includes('/people?'))).toBe(true);
  });
  it('invalidates central access after a server denial so linked policy caches also clear', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.load()).rejects.toThrow('Access revoked');
    expect(api.source()).toBeNull();
    expect(TestBed.inject(CompanyAccessService).invalidate).toHaveBeenCalled();
  });
  it('clears linked access for a missing company collection but refreshes access only once', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (path.includes('/reviews?'))
        throw Object.assign(Error('Company unavailable'), { status: 404 });
      return handler(path, body);
    });
    await expect(api.load()).rejects.toThrow('Company unavailable');
    await expect(api.load()).rejects.toThrow('Company unavailable');
    expect(TestBed.inject(CompanyAccessService).invalidate).toHaveBeenCalledTimes(1);
    expect(api.source()).toBeNull();
  });
  it('clears linked access when a company membership disappears during a write', async () => {
    await api.load();
    request.mockRejectedValueOnce(
      Object.assign(Error('Company is not available.'), {
        status: 404,
        response: { detail: 'Company is not available.' },
      }),
    );
    await expect(api.queue('assignment', 'In-platform', 'Approved message')).rejects.toThrow(
      'Company is not available.',
    );
    expect(TestBed.inject(CompanyAccessService).invalidate).toHaveBeenCalled();
    expect(api.source()).toBeNull();
  });
  it('retries only the refresh after a notification was saved successfully', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let failed = false;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (body) return notification();
      if (!failed) {
        failed = true;
        throw Error('Refresh unavailable');
      }
      return handler(path, body);
    });
    await expect(api.queue('assignment', 'In-platform', 'One message')).rejects.toThrow(
      'Refresh unavailable',
    );
    await api.queue('assignment', 'In-platform', 'One message');
    expect(
      request.mock.calls.filter(([path, body]) => body && path.endsWith('/notifications')).length,
    ).toBe(1);
  });
  it('does not create a duplicate approval after its save committed and refresh failed', async () => {
    const value = {
      id: 'draft',
      assignmentId: 'assignment',
      personId: 'person',
      extraMinutes: 15,
      untimed: false,
      reason: 'Approved support',
      expires: '2027-01-01',
      approvedBy: '',
      approvedAt: '',
    };
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let fail = true;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (body)
        return {
          ...value,
          id: 'approval',
          company_id: 'company',
          version: 1,
          etag: '"v1"',
          approvedBy: 'Manager',
          approvedAt: '2026-11-12T12:00:00Z',
        };
      if (fail) throw Error('Refresh unavailable');
      return handler(path, body);
    });
    await expect(api.approveAdjustment(value)).rejects.toThrow('Refresh unavailable');
    fail = false;
    await api.approveAdjustment(value);
    expect(
      request.mock.calls.filter(([path, body]) => body && path.endsWith('/adjustments')).length,
    ).toBe(1);
  });
  it('retains a requested resolution if creation committed before resolution failed', async () => {
    const value = {
      ...review(),
      id: 'draft',
      status: 'Resolved',
      actions: 'Support completed',
      decision: 'Close review',
    } as AcademyReview & { version?: number; etag?: string };
    delete value.version;
    delete value.etag;
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let fail = true;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (path.endsWith('/review/resolve') && body) {
        if (fail) throw Error('Resolution unavailable');
        return {
          ...review(2),
          status: 'Resolved',
          actions: value.actions,
          decision: value.decision,
          resolvedAt: '2026-11-12T12:00:00Z',
        };
      }
      if ((path.endsWith('/reviews') && body) || path.endsWith('/reviews/review')) return review();
      return handler(path, body);
    });
    await expect(api.saveReview(value)).rejects.toThrow('Resolution unavailable');
    expect(value.id).toBe('review');
    expect(value.status).toBe('Resolved');
    fail = false;
    await api.saveReview(value);
    expect(
      request.mock.calls.filter(([path, body]) => body && path.endsWith('/reviews')).length,
    ).toBe(1);
    expect(value.resolvedAt).toBeTruthy();
  });
  it('allows a genuinely changed approval after a committed save had a refresh failure', async () => {
    const value = {
      id: 'draft',
      assignmentId: 'assignment',
      personId: 'person',
      extraMinutes: 15,
      untimed: false,
      reason: 'Approved support',
      expires: '2027-01-01',
      approvedBy: '',
      approvedAt: '',
    };
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let fail = true,
      issued = 0;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (body)
        return {
          ...value,
          id: 'approval-' + ++issued,
          company_id: 'company',
          version: 1,
          etag: '"v1"',
        };
      if (fail) throw Error('Refresh unavailable');
      return handler(path, body);
    });
    await expect(api.approveAdjustment(value)).rejects.toThrow('Refresh unavailable');
    value.extraMinutes = 30;
    fail = false;
    await api.approveAdjustment(value);
    expect(issued).toBe(2);
    expect(value.id).toBe('approval-2');
  });
  it('finishes a committed start transition without demanding a second edit permission', async () => {
    await api.load();
    actions.set(new Set(['read', 'approve']));
    const value = { ...review(), status: 'In progress' } as AcademyReview & {
      version: number;
      etag: string;
    };
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let fail = true;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (body || path.endsWith('/reviews/review')) return { ...review(2), status: 'In progress' };
      if (fail) throw Error('Refresh unavailable');
      return handler(path, body);
    });
    await expect(api.saveReview(value)).rejects.toThrow('Refresh unavailable');
    fail = false;
    await api.saveReview(value);
    expect(request.mock.calls.filter(([, body]) => body).length).toBe(1);
  });
  it('permits an intentional new message after a successful read completed the prior operation', async () => {
    const handler = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    let fail = true,
      issued = 0;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (body) {
        issued++;
        return notification();
      }
      if (fail) throw Error('Refresh unavailable');
      return handler(path, body);
    });
    await expect(api.queue('assignment', 'In-platform', 'Same message')).rejects.toThrow(
      'Refresh unavailable',
    );
    fail = false;
    await api.load();
    await api.queue('assignment', 'In-platform', 'Same message');
    expect(issued).toBe(2);
  });
});
