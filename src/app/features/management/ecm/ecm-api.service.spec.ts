import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Ecm } from './ecm';
import { EcmWorkflows } from './ecm-workflows';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { EcmApi } from './ecm-api.service';
import { ECM_PROVIDERS } from './ecm.providers';
import { EcmService } from './ecm.service';
import { EcmOperations } from './ecm.operations';
import { ManagementStore } from '../shared/management.store';

const board = (changes: any = {}) => ({
  company_id: 'north',
  date: '2026-11-13',
  timezone: 'Europe/London',
  as_of: '2026-11-13T10:00:00Z',
  revision: 'source-1',
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      company_id: 'north',
      id: 'visit',
      clientId: 'patient',
      state: 'Published',
      version: 2,
      etag: '"v2"',
      staffIds: ['worker'],
      attendance: [{ personId: 'worker', start: '2026-11-13T09:00:00Z', end: null }],
      start: '09:00',
      end: '09:30',
      date: '2026-11-13',
      carers: 1,
      mileage: null,
    },
  ],
  context: {
    clients: [{ id: 'patient', name: 'Recorded person' }],
    staff: [{ id: 'worker', name: 'Recorded worker' }],
    calls: [],
  },
  data: {
    lateMinutes: 5,
    riskMinutes: 15,
    missedMinutes: 30,
    styles: {},
    records: [],
    evidence: [],
    notifications: [],
    escalations: [],
    invoices: [],
    packs: [],
    feed: [],
  },
  meta: { settings_etag: '"v1"', owners: [], unavailable: [] },
  ...changes,
});
describe('Connected live visits', () => {
  let api: EcmApi, request: ReturnType<typeof vi.fn>, scope: ReturnType<typeof signal<string>>;
  let company: ReturnType<typeof signal<string>>, allowed: ReturnType<typeof signal<boolean>>;
  beforeEach(() => {
    scope = signal('north:actor');
    company = signal('north');
    allowed = signal(true);
    request = vi.fn(async () => board());
    TestBed.configureTestingModule({
      imports: [Ecm, EcmWorkflows],
      providers: [
        provideRouter([]),
        ...ECM_PROVIDERS,
        {
          provide: AuthService,
          useValue: { api: request, currentUser: () => ({ email: 'worker@example.test' }) },
        },
        {
          provide: ServiceUsersApi,
          useValue: { scope, companyId: company, allowed, access: { can: () => allowed() } },
        },
      ],
    });
    api = TestBed.inject(EcmApi);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('uses the connected graph and starts without browser demonstration data', () => {
    expect(TestBed.inject(EcmService)).toBe(api);
    expect(TestBed.inject(EcmOperations)).toBe(api);
    expect(TestBed.inject(ManagementStore)).toBe(api.store);
    expect(api.visits()).toEqual([]);
    expect(api.data().records).toEqual([]);
  });
  it('loads canonical visit and client identities and nullable attendance', async () => {
    expect(await api.load('2026-11-13')).toBe(true);
    expect(api.visits()[0].id).toBe('visit');
    expect(api.visits()[0].attendance[0].end).toBe('');
    expect(api.clients()[0].id).toBe('patient');
    expect(api.loadedAt()).toBe('2026-11-13T10:00:00Z');
  });
  it('rejects cross-company visits and clears an already loaded board', async () => {
    await api.load('2026-11-13');
    request.mockResolvedValue(board({ company_id: 'south' }));
    expect(await api.load('2026-11-13')).toBe(false);
    expect(api.visits()).toEqual([]);
    expect(api.loadedAt()).toBe('');
  });
  it('rejects incomplete or mixed-version pagination', async () => {
    request.mockResolvedValueOnce(board({ count: 2, next: '/companies/north/ecm?page=2' }));
    request.mockResolvedValueOnce(
      board({ count: 2, revision: 'source-2', results: [{ ...board().results[0], id: 'other' }] }),
    );
    expect(await api.load('2026-11-13')).toBe(false);
    expect(api.visits()).toEqual([]);
  });
  it('discards late responses after a workspace change', async () => {
    let complete!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (complete = resolve)));
    const pending = api.load('2026-11-13');
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    complete(board());
    await pending;
    expect(api.visits()).toEqual([]);
  });
  it('clears cached records immediately when access is revoked', async () => {
    await api.load('2026-11-13');
    allowed.set(false);
    TestBed.tick();
    expect(api.visits()).toEqual([]);
    expect(api.clients()).toEqual([]);
    expect(api.can('export')).toBe(false);
  });
  it('waits for attendance acknowledgement and sends version and idempotency headers', async () => {
    await api.load('2026-11-13');
    request.mockResolvedValueOnce({ company_id: 'north', id: 'visit', version: 3, etag: '"v3"' });
    expect(
      await api.attendance('visit', 'worker', '2026-11-13T09:30:00Z', 'Check out', 'Care complete'),
    ).toBeNull();
    const call = request.mock.calls[1] as any[];
    expect(call[0]).toBe('/companies/north/ecm/visits/visit/attendance');
    expect(call[3]['If-Match']).toBe('"v2"');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(api.saving()).toBe(false);
  });
  it('prioritizes saving over a pending refresh and discards that older response', async () => {
    await api.load('2026-11-13');
    let complete!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (complete = resolve)));
    const refresh = api.load('2026-11-13');
    request.mockResolvedValueOnce({ company_id: 'north', id: 'visit', version: 3, etag: '"v3"' });
    const result = await api.attendance(
      'visit',
      'worker',
      '2026-11-13T09:30:00Z',
      'Check out',
      'Verified departure',
    );
    expect(result).toBeNull();
    complete(board({ results: [] }));
    await refresh;
    expect(api.visits()).toHaveLength(1);
    expect(api.loading()).toBe(false);
  });
  it('provides the wallboard with the authenticated company identity', async () => {
    expect(api.store.company()).toBeNull();
    request.mockResolvedValue(
      board({ meta: { company: { id: 'north', code: 'NORTH', name: 'North Care' }, owners: [] } }),
    );
    await api.load('2026-11-13');
    expect(api.store.company()?.code).toBe('NORTH');
    allowed.set(false);
    expect(api.store.company()).toBeNull();
  });
  it('exports the all-records view without blank identity filters', async () => {
    const download = vi.spyOn(api as any, 'saveBlob').mockImplementation(() => undefined);
    request.mockResolvedValueOnce(new Blob(['Date,Service user']));
    await api.exportReport({
      date: '2026-11-13',
      client: '',
      staff: '',
      search: '',
      status: '',
      double: 'false',
      high: 'false',
    });
    const url = new URL(request.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.has('client')).toBe(false);
    expect(url.searchParams.has('staff')).toBe(false);
    expect(url.searchParams.get('double')).toBe('false');
    expect(download).toHaveBeenCalled();
  });
  it('pins the version of an open settings form across automatic refreshes', async () => {
    await api.load('2026-11-13');
    api.beginEdit('Board settings');
    const draft = structuredClone(api.data());
    request.mockResolvedValueOnce(board({ meta: { settings_etag: '"v2"' } }));
    await api.load('2026-11-13');
    request.mockRejectedValueOnce(
      Object.assign(new Error('Settings changed. Reload.'), { status: 412 }),
    );
    expect(await api.settings(draft)).toContain('Settings changed');
    expect((request.mock.calls[2] as any[])[3]['If-Match']).toBe('"v1"');
  });
  it('pins the visit version until its form is closed', async () => {
    await api.load('2026-11-13');
    api.beginEdit('Reschedule visit', 'visit');
    request.mockResolvedValueOnce(
      board({ results: [{ ...board().results[0], version: 3, etag: '"v3"' }] }),
    );
    await api.load('2026-11-13');
    request.mockRejectedValueOnce(
      Object.assign(new Error('Visit changed. Reload.'), { status: 412 }),
    );
    await api.reschedule('visit', '2026-11-13', '10:00', 'Agreed change', true);
    expect((request.mock.calls[2] as any[])[3]['If-Match']).toBe('"v2"');
    api.endEdit();
    request.mockRejectedValueOnce(Object.assign(new Error('Validation failed'), { status: 400 }));
    await api.reschedule('visit', '2026-11-13', '10:00', 'Agreed change', true);
    expect((request.mock.calls[3] as any[])[3]['If-Match']).toBe('"v3"');
  });
  it('retains a case form version when a newer case arrives during editing', async () => {
    request.mockResolvedValueOnce(
      board({
        data: {
          ...board().data,
          escalations: [{ id: 'case', ownerId: 'member', state: 'In review', etag: '"v2"' }],
        },
      }),
    );
    await api.load('2026-11-13');
    request.mockRejectedValueOnce(
      Object.assign(new Error('Case changed. Reload.'), { status: 412 }),
    );
    await api.escalation('case', 'member', 'Resolved', 'Verified care', '"v1"');
    expect((request.mock.calls[1] as any[])[3]['If-Match']).toBe('"v1"');
  });
  it('clears open notes and media when the company scope changes', async () => {
    const fixture = TestBed.createComponent(Ecm);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    page.selected.set('visit');
    page.open('Record follow-up');
    page.action.note = 'Private draft';
    page.photo.set('blob:private');
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    expect(page.modal()).toBe('');
    expect(page.action.note).toBe('');
    expect(page.photo()).toBe('');
    expect(page.selected()).toBe('');
    fixture.destroy();
  });
  it('submits the version captured by the escalation form and clears it after success', async () => {
    const fixture = TestBed.createComponent(EcmWorkflows);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    const row = { id: 'case', ownerId: 'member', state: 'Open', etag: '"v1"' };
    page.caseForm(row).note = 'Verified welfare';
    const save = vi.spyOn(api, 'escalation').mockResolvedValue(null);
    page.updateCase({ ...row, state: 'In review', etag: '"v2"' });
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith('case', 'member', 'Open', 'Verified welfare', '"v1"');
    expect(page.cases.case).toBeUndefined();
    fixture.destroy();
  });
  it('never fabricates delivery receipts, invoices or payroll transfers', async () => {
    expect(await api.delivery('notice', 'Delivered')).toContain('provider receipts');
    expect(api.payroll.can('create')).toBe(false);
    expect(api.rota.sendToPayroll('2026-11-13')).toContain('not configured');
    expect(request).not.toHaveBeenCalled();
  });
});
