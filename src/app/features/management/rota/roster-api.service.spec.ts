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
  it('loads the real workspace with bounded dates and client filter', async () => {
    expect(await service.load('2026-11-11', '2026-11-30', 'client')).toBe(true);
    expect(request.mock.calls[0][0]).toBe(
      '/companies/north/roster?start=2026-11-11&end=2026-11-30&client=client',
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
    await service.load('2026-11-11', '2026-11-30');
    const row = service.data().visits[0];
    await service.updateVisit(
      { ...row, start: '09:00', end: '09:30' },
      'north',
      JSON.stringify(row),
      'Correct the start time',
    );
    const edit = request.mock.calls.find((c) => c[2] === 'PATCH')!;
    expect(edit[0]).toBe('/companies/north/roster/visits/visit');
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
});
