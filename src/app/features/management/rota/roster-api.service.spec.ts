import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { RosterApi } from './roster-api.service';

import { rosterWorkspace, rosterVisit } from './roster.spec-fixtures';
describe('Roster API company boundaries', () => {
  let service: RosterApi,
    scope: ReturnType<typeof signal<string>>,
    company: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    request: ReturnType<typeof vi.fn>,
    workspace: any;
  beforeEach(() => {
    scope = signal('north:actor:1');
    company = signal('north');
    permissions = new Set(['read', 'create', 'edit', 'publish', 'archive', 'export']);
    workspace = rosterWorkspace();
    request = vi.fn(async (_path: string, _body?: any, method?: string) =>
      method ? { company_id: 'north', ids: ['visit'] } : structuredClone(workspace),
    );
    TestBed.configureTestingModule({
      providers: [
        RosterApi,
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: company,
            allowed: () => permissions.has('read'),
            access: { can: (_m: string, _s: string, a: string) => permissions.has(a) },
            selected: signal(null),
          },
        },
      ],
    });
    service = TestBed.inject(RosterApi);
    TestBed.tick();
  });
  function historyPage(results: any[], changes: any = {}) {
    return {
      company_id: 'north',
      count: results.length,
      next: null,
      previous: null,
      results,
      context: structuredClone(workspace),
      meta: {
        revision: 'history-1',
        as_of: '2026-11-12T12:00:00+00:00',
        metrics: { visits: 27, completed: 12, cancelled: 3, audit: 204 },
        training_options: [],
      },
      ...changes,
    };
  }
  it('loads every history page and preserves the filters for independently authorised export', async () => {
    const a = { ...rosterVisit(), id: 'first' },
      b = { ...rosterVisit(), id: 'second' };
    request.mockResolvedValueOnce(
      historyPage([a], { count: 2, next: '/companies/north/roster/history?page=2' }),
    );
    request.mockResolvedValueOnce(historyPage([b], { count: 2, context: null }));
    const filters = {
      start: '2025-01-01',
      end: '2026-11-12',
      client: 'client',
      search: 'Recorded',
    };
    expect(await service.loadHistory(filters)).toBe(true);
    expect(service.data().visits.map((v) => v.id)).toEqual(['first', 'second']);
    expect(service.historyMeta()?.metrics.visits).toBe(27);
    request.mockResolvedValue(historyPage([a, b]));
    expect(await service.refresh(true)).toBe(true);
    expect(request.mock.calls.at(-1)![0]).toContain(
      '/history/export?page_size=100&start=2025-01-01',
    );
    expect(request.mock.calls.at(-1)![0]).toContain('client=client&search=Recorded');
  });
  it('discards history when a later page fails, changes version or belongs to another company', async () => {
    const row = rosterVisit();
    for (const next of [
      historyPage([row], { company_id: 'south', context: null, count: 2 }),
      historyPage([row], {
        count: 2,
        meta: { revision: 'changed', as_of: '2026-11-12T12:00:00+00:00' },
      }),
    ]) {
      request.mockResolvedValueOnce(
        historyPage([row], { count: 2, next: '/companies/north/roster/history?page=2' }),
      );
      request.mockResolvedValueOnce(next);
      expect(await service.loadHistory({})).toBe(false);
      expect(service.raw()).toBeNull();
      expect(service.historyMeta()).toBeNull();
    }
    request.mockResolvedValueOnce(
      historyPage([row], { count: 2, next: '/companies/north/roster/history?page=2' }),
    );
    request.mockRejectedValueOnce(new Error('History interrupted'));
    expect(await service.loadHistory({})).toBe(false);
    expect(service.data().visits).toEqual([]);
  });
  it('loads the audit owner and clears history when access is revoked', async () => {
    request.mockResolvedValue(
      historyPage([
        {
          id: 'event',
          clientId: 'client',
          userId: 'actor',
          at: '2026-11-12T10:00:00Z',
          user: 'Recorded actor',
          action: 'Visit published',
          detail: 'Reviewed care',
        },
      ]),
    );
    expect(await service.loadHistory({ view: 'audit', search: 'published' })).toBe(true);
    expect(service.data().audit[0].action).toBe('Visit published');
    expect(service.data().visits).toEqual([]);
    expect(request.mock.calls[0][0]).toContain('/history/audit?');
    request.mockRejectedValue(Object.assign(new Error('History read revoked'), { status: 403 }));
    expect(await service.refresh()).toBe(false);
    expect(service.raw()).toBeNull();
    expect(service.historyMeta()).toBeNull();
    expect(service.can('view')).toBe(false);
  });
  it('loads the real workspace with bounded dates and client filter', async () => {
    expect(await service.load('2026-11-11', '2026-11-30', 'client')).toBe(true);
    expect(request.mock.calls[0][0]).toBe(
      '/companies/north/service-users/client/visits?start=2026-11-11&end=2026-11-30',
    );
    expect(service.data().calls[0].tasks).toBe('Recorded instructions');
    expect(localStorage.getItem('rota')).toBeNull();
  });
  it('clears data on a workspace change and ignores a late response', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = service.load('2026-11-11', '2026-11-30');
    company.set('south');
    scope.set('south:actor:1');
    TestBed.tick();
    resolve(workspace);
    expect(await pending).toBe(false);
    expect(service.data().clients).toEqual([]);
  });
  it('rejects a foreign company response', async () => {
    request.mockResolvedValue({ ...workspace, company_id: 'south' });
    expect(await service.load('2026-11-11', '2026-11-30')).toBe(false);
    expect(service.data().calls).toEqual([]);
  });
  it('clears previously loaded rows when the backend denies access', async () => {
    await service.load('2026-11-11', '2026-11-30');
    request.mockRejectedValue(new Error('Access revoked'));
    await service.refresh();
    expect(service.data().clients).toEqual([]);
    expect(service.error()).toBe('Access revoked');
  });
  it('uses the original etag and entered reason for an edit', async () => {
    workspace.visits = [rosterVisit()];
    await service.load('2026-11-11', '2026-11-30', 'client');
    const row = service.data().visits[0];
    await service.updateVisit(
      { ...row, start: '09:00', end: '09:30' },
      'north',
      JSON.stringify(row),
      'Correct the start time',
    );
    const edit = request.mock.calls.find((c) => c[2] === 'PATCH')!;
    expect(edit[0]).toBe('/companies/north/service-users/client/visits/visits/visit');
    expect(edit[1]).toMatchObject({ start: '09:00', reason: 'Correct the start time' });
    expect((edit as any)[3]['If-Match']).toBe('"v1"');
  });
  it('retains the idempotency key for a failed retry', async () => {
    request.mockRejectedValue(new Error('Connection interrupted'));
    await service.generate('client', ['call'], '2026-11-11', '2026-11-11', [], 'Regular');
    await service.generate('client', ['call'], '2026-11-11', '2026-11-11', [], 'Regular');
    expect((request.mock.calls[0] as any)[3]['Idempotency-Key']).toBe(
      (request.mock.calls[1] as any)[3]['Idempotency-Key'],
    );
  });
  it('keeps legacy unknown requirements distinct from complete allocation', async () => {
    workspace.visits = [
      { ...rosterVisit(), carers: null, requirementsRecorded: false, state: 'Planned' },
    ];
    await service.load('2026-11-11', '2026-11-30');
    expect(service.conflicts(service.data().visits[0])).toContain(
      'Carer requirements have not been recorded.',
    );
  });
  it('reauthorises exports through the server', async () => {
    await service.load('2026-11-11', '2026-11-30');
    await service.refresh(true);
    expect(request.mock.calls.at(-1)![0]).toContain('/roster/export?');
    permissions.delete('export');
    expect(service.can('export')).toBe(false);
  });
  it('clears roster rows and candidates when a detail read is denied', async () => {
    await service.load('2026-11-11', '2026-11-30');
    request.mockRejectedValueOnce(
      Object.assign(new Error('Rostering access revoked'), { status: 403 }),
    );
    await expect(service.detailVisit('visit')).rejects.toThrow('Rostering access revoked');
    expect(service.data().clients).toEqual([]);
    expect(service.candidateRows()).toEqual([]);
    expect(service.can('view')).toBe(false);
  });
  it('rejects records belonging to another service user in a scoped schedule', async () => {
    workspace.visits = [{ ...rosterVisit(), clientId: 'another-person' }];
    expect(await service.load('2026-11-11', '2026-11-30', 'client')).toBe(false);
    expect(service.raw()).toBeNull();
    expect(service.error()).toContain('does not match this service user');
  });
  it('keeps company settings on the company route while viewing a scoped schedule', async () => {
    await service.load('2026-11-11', '2026-11-30', 'client');
    expect(await service.saveTravel(15)).toBeNull();
    const save = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(save[0]).toBe('/companies/north/roster/settings');
    expect(request.mock.calls.at(-1)![0]).toContain('/service-users/client/visits?');
  });
  it('loads overview filters and preserves them after a mutation refresh', async () => {
    const overview = {
      ...workspace,
      metrics: [{ key: 'total', value: 3, percentage: null }],
      alerts: [],
      training_options: [],
      previous_count: 0,
      change_percentage: null,
      staff_on_leave: null,
      as_of: '2026-11-11T12:00:00Z',
    };
    request.mockResolvedValue(overview);
    await service.load('2026-11-09', '2026-11-15', '', false, {
      allocation: 'Unallocated',
      search: 'Morning',
    });
    expect(request.mock.calls.at(-1)![0]).toContain(
      '/roster/overview?start=2026-11-09&end=2026-11-15&allocation=Unallocated&search=Morning',
    );
    expect(service.overview()?.metrics[0].value).toBe(3);
    await service.refresh();
    expect(request.mock.calls.at(-1)![0]).toContain('/overview?');
    await service.refresh(true);
    expect(service.overview()?.metrics[0].value).toBe(3);
    await service.refresh();
    expect(request.mock.calls.at(-1)![0]).toContain('allocation=Unallocated');
  });
  it('discards stale overview responses and clears summaries on denial', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const first = service.load('2026-11-09', '2026-11-15', '', false, {});
    request.mockResolvedValue({
      ...workspace,
      metrics: [{ key: 'total', value: 2, percentage: null }],
    });
    await service.load('2026-11-16', '2026-11-22', '', false, {});
    resolve({ ...workspace, metrics: [{ key: 'total', value: 99, percentage: null }] });
    expect(await first).toBe(false);
    expect(service.overview()?.metrics[0].value).toBe(2);
    request.mockRejectedValue(Object.assign(new Error('Access revoked'), { status: 403 }));
    await service.refresh();
    expect(service.overview()).toBeNull();
    expect(service.raw()).toBeNull();
  });
  function packagePage(calls: any[], changes: any = {}) {
    return {
      company_id: 'north',
      count: calls.length,
      next: null,
      previous: null,
      results: calls,
      context: workspace,
      meta: {
        revision: 'packages-v1',
        metrics: {
          active_clients: 1,
          active_packages: 77,
          regular_carers: 2,
          priority_packages: 1,
        },
        training_options: [],
      },
      ...changes,
    };
  }
  it('collects every page for the selected service user and keeps server-wide totals', async () => {
    const a = { ...workspace.calls[0], id: 'first' },
      b = { ...workspace.calls[0], id: 'second' };
    request.mockResolvedValueOnce(
      packagePage([a], {
        count: 2,
        next: '/companies/north/roster/call-packages/workspace?client=client&page=2',
      }),
    );
    request.mockResolvedValueOnce(packagePage([b], { count: 2, context: null }));
    expect(await service.loadPackages('client')).toBe(true);
    expect(service.data().calls.map((c) => c.id)).toEqual(['first', 'second']);
    expect(service.packageMeta()?.metrics.active_packages).toBe(77);
    expect(request.mock.calls[0][0]).toContain(
      '/call-packages/workspace?page_size=100&client=client',
    );
    request.mockResolvedValue(packagePage([a]));
    await service.refresh();
    expect(request.mock.calls.at(-1)![0]).toContain('client=client');
  });
  it('rejects mixed, incomplete and foreign package pages without showing partial results', async () => {
    const a = { ...workspace.calls[0], id: 'first' };
    request.mockResolvedValueOnce(
      packagePage([a], {
        count: 2,
        next: '/companies/north/roster/call-packages/workspace?client=client&page=2',
      }),
    );
    request.mockResolvedValueOnce(packagePage([a], { count: 2, meta: { revision: 'changed' } }));
    expect(await service.loadPackages('client')).toBe(false);
    expect(service.raw()).toBeNull();
    expect(service.packageMeta()).toBeNull();
    request.mockResolvedValue(
      packagePage([a], { next: '/companies/south/roster/call-packages/workspace?page=2' }),
    );
    expect(await service.loadPackages('client')).toBe(false);
    expect(service.data().calls).toEqual([]);
  });
  it('uses the editor version when a package refresh has a newer version', async () => {
    request.mockResolvedValue(packagePage(workspace.calls));
    await service.loadPackages('client');
    const original = service.data().calls[0];
    service.raw.update((r) =>
      r ? { ...r, calls: r.calls.map((c) => ({ ...c, etag: '"v2"', version: 2 })) } : r,
    );
    request.mockImplementation(async (_path: string, _body?: any, method?: string) =>
      method ? { ...workspace.calls[0], version: 2, etag: '"v2"' } : packagePage(workspace.calls),
    );
    await service.saveCall({ ...original, tasks: 'Entered edits' });
    const write = request.mock.calls.find((c) => c[2] === 'PATCH')!;
    expect(write[0]).toBe('/companies/north/roster/call-packages/call');
    expect((write as any)[3]['If-Match']).toBe('"v1"');
    expect(request.mock.calls.at(-1)![0]).toContain('/call-packages/workspace?');
  });
  it('clears package totals and rows when access is revoked', async () => {
    request.mockResolvedValue(packagePage(workspace.calls));
    await service.loadPackages('client');
    request.mockRejectedValue(Object.assign(new Error('Package access revoked'), { status: 403 }));
    await service.refresh();
    expect(service.packageMeta()).toBeNull();
    expect(service.raw()).toBeNull();
    expect(service.can('view')).toBe(false);
  });
  it('keeps the server-assigned service user ID for the next call package', async () => {
    (service.records as any).save = vi.fn(async () => ({ id: 'server-client' }));
    request.mockResolvedValue(packagePage([]));
    await service.loadPackages();
    const draft = { ...workspace.clients[0], id: 'temporary-id' };
    expect(await service.saveClient(draft)).toBeNull();
    expect(draft.id).toBe('server-client');
  });
  it('loads authoritative publishing reviews and reauthorises export sources', async () => {
    const data = {
      ...workspace,
      metrics: { drafts: 1, unallocated: 0, conflicts: 0, published: 0 },
      reviews: { visit: { etag: '"v1"', ready: true, issues: [] } },
      training_options: [],
    };
    request.mockResolvedValue(data);
    expect(await service.load('2026-11-13', '2026-11-20', '', false, undefined, true)).toBe(true);
    expect(request.mock.calls[0][0]).toBe(
      '/companies/north/roster/publishing?start=2026-11-13&end=2026-11-20',
    );
    expect(service.publishing()?.reviews['visit'].ready).toBe(true);
    await service.refresh(true);
    expect(request.mock.calls.at(-1)![0]).toContain('/publishing/export?');
    request.mockRejectedValue(Object.assign(new Error('Publishing read revoked'), { status: 403 }));
    await service.refresh();
    expect(service.publishing()).toBeNull();
    expect(service.raw()).toBeNull();
  });
  it('uses a new command key when restoring a previously saved travel rule', async () => {
    let version = 0;
    request.mockImplementation(async (_path: string, body?: any, method?: string) => {
      if (method === 'PATCH') {
        workspace.travelMinutes = body.travelMinutes;
        workspace.settings_etag = '"v' + ++version + '"';
        return { company_id: 'north', ids: [] };
      }
      return structuredClone(workspace);
    });
    await service.load('2026-11-13', '2026-11-20');
    for (const value of [20, 25, 20]) expect(await service.saveTravel(value)).toBeNull();
    const writes = request.mock.calls.filter((call) => call[2] === 'PATCH');
    expect((writes[0] as any)[3]['Idempotency-Key']).not.toBe(
      (writes[2] as any)[3]['Idempotency-Key'],
    );
    expect((writes[2] as any)[3]['If-Match']).toBe('"v2"');
  });
});
