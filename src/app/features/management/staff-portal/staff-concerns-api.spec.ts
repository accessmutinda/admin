import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { StaffConcernsApi, ConnectedConcern } from './staff-concerns-api.service';
import { PortalConcerns } from './portal-concerns';

const identity = () => ({
  company_id: 'north',
  actor_id: '12',
  person_id: 'staff',
  employment_id: 'employment',
  name: 'Linked Worker',
  email: 'worker@example.test',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
  local_date: '2026-11-13',
  timezone: 'Europe/London',
  checklist: ['Review source records'],
  contacts: [{ name: 'Linked Worker', email: 'worker@example.test', role: 'Carer' }],
  clients: [],
  capabilities: { can_create: true, can_edit: true, can_export: true },
});
const row = () => ({
  id: 'case-1',
  company_id: 'north',
  version: 1,
  etag: '"v1"',
  reference: 'SC-2026-case1',
  title: 'Recorded concern',
  description: 'Concern details',
  type: 'Safeguarding',
  priority: 'High',
  clientId: '',
  visitId: '',
  careEventId: '',
  staffEmail: '',
  assignedTo: 'worker@example.test',
  followers: [],
  visitDate: '2026-11-13',
  visitTime: '',
  location: '',
  outcome: '',
  checklist: [
    {
      id: 'check-1',
      title: 'Review source records',
      done: false,
      assignedTo: '',
      due: null,
      completedAt: null,
    },
  ],
  history: [{ status: 'Raised', at: '2026-11-13T10:00:00Z', actor: 'Linked Worker' }],
  notes: [],
  evidence: [],
  attachment_ids: [],
  raisedBy: 'Linked Worker',
  raisedAt: '2026-11-13T10:00:00Z',
  status: 'Raised',
  can_edit: true,
  can_note: true,
});

describe('Staff concern connection', () => {
  let api: StaffConcernsApi,
    request: ReturnType<
      typeof vi.fn<
        (
          path: string,
          body?: any,
          method?: string,
          headers?: Record<string, string>,
        ) => Promise<any>
      >
    >;
  const accessSnapshot = signal<any>(null);
  const company = signal('north'),
    actor = signal({ id: '12' });
  beforeEach(() => {
    accessSnapshot.set(null);
    company.set('north');
    actor.set({ id: '12' });
    request = vi.fn(async (path, body, method) => {
      if (path.endsWith('/context')) return identity();
      if (path.includes('/audit')) return { company_id: 'north', results: [] };
      if (method === 'POST' || method === 'PATCH')
        return { ...row(), ...body, version: 2, etag: '"v2"' };
      if (path.includes('?page='))
        return {
          company_id: 'north',
          count: 1,
          next: null,
          previous: null,
          results: [row()],
          meta: {},
        };
      return row();
    });
    TestBed.configureTestingModule({
      providers: [
        StaffConcernsApi,
        provideRouter([]),
        { provide: AuthService, useValue: { api: request, profile: actor } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: accessSnapshot },
        },
        { provide: StaffDashboardApi, useValue: { rememberCompany: vi.fn() } },
      ],
    });
    api = TestBed.inject(StaffConcernsApi);
  });
  it('verifies exact staff identity before loading concerns without journal or HR requests', async () => {
    await api.load();
    expect(api.ready()).toBe(true);
    expect(api.email()).toBe('worker@example.test');
    expect(request.mock.calls[0][0]).toBe('/companies/north/staff-portal/concerns/context');
    expect(request.mock.calls.every((call) => call[0].includes('/staff-portal/concerns'))).toBe(
      true,
    );
    expect(api.concerns()[0].reference).toBe('SC-2026-case1');
  });
  it.each(['staff_inactive', 'staff_not_linked'])(
    'handles %s without loading records',
    async (code) => {
      request.mockRejectedValue(
        Object.assign(Error('Staff account unavailable'), { status: 403, code }),
      );
      await api.load();
      expect(api.staffReady()).toBe(false);
      expect(api.code()).toBe(code);
      expect(api.concerns()).toEqual([]);
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it('rejects another actor context', async () => {
    request.mockResolvedValue({ ...identity(), actor_id: '13' });
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('does not belong');
  });
  it('rejects a foreign-company result', async () => {
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, ...args) =>
      path.includes('?page=')
        ? { company_id: 'south', next: null, results: [row()] }
        : normal(path, ...args),
    );
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.concerns()).toEqual([]);
    expect(api.error()).toContain('does not match');
  });
  it('loads all authorised concern pages for complete local filters and metrics', async () => {
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, ...args) =>
      path.includes('?page=1')
        ? { company_id: 'north', next: 2, results: [row()] }
        : path.includes('?page=2')
          ? { company_id: 'north', next: null, results: [{ ...row(), id: 'case-2' }] }
          : normal(path, ...args),
    );
    await api.load();
    expect(api.concerns().map((c) => c.id)).toEqual(['case-1', 'case-2']);
  });
  it('retains verified records when only access request metadata changes', async () => {
    const context = {
      company_active: true,
      platform: false,
      revision: 1,
      permissions: ['staff_portal.concerns.read'],
      core_permissions: [],
      enabled_modules: ['staff_portal'],
      roles: [{ id: 'role-1' }],
      request_id: 'first',
    };
    accessSnapshot.set(context);
    TestBed.tick();
    await api.load();
    const scope = api.scope();
    accessSnapshot.set({ ...context, request_id: 'second' });
    TestBed.tick();
    expect(api.scope()).toBe(scope);
    expect(api.staffReady()).toBe(true);
    expect(api.concerns()).toHaveLength(1);
  });
  it('creates with idempotency and keeps actor, timestamps and draft ids out of submitted facts', async () => {
    await api.load();
    const draft = api.newConcern();
    draft.title = 'New concern';
    draft.description = 'Details';
    expect(await api.saveConcern(draft)).toBeNull();
    const call = request.mock.calls.find((call) => call[2] === 'POST')!;
    expect(call[0]).toBe('/companies/north/staff-portal/concerns');
    expect(call[3]).toHaveProperty('Idempotency-Key');
    expect(call[1]).not.toHaveProperty('raisedBy');
    expect(call[1]).not.toHaveProperty('status');
    expect(call[1].checklist).toEqual([]);
    expect(draft.etag).toBe('"v2"');
  });
  it('uses named versioned status and reopening commands', async () => {
    await api.load();
    const draft = structuredClone(api.concerns()[0]);
    draft.status = 'Resolved';
    draft.outcome = 'Actions complete';
    expect(await api.saveConcern(draft)).toBeNull();
    let call = request.mock.calls.find((call) => call[0].endsWith('/transition'))!;
    expect(call[2]).toBe('POST');
    expect(call[3]?.['If-Match']).toBe('"v1"');
    draft.status = 'Closed';
    expect(await api.saveConcern(draft)).toBeNull();
    draft.status = 'Under investigation';
    expect(await api.saveConcern(draft)).toBeNull();
    expect(request.mock.calls.some((call) => call[0].endsWith('/reopen'))).toBe(true);
  });
  it('hides all private context and concerns immediately when the account changes', async () => {
    expect(api.staffReady()).toBe(false);
    expect(api.context()).toBeNull();
    await api.load();
    expect(api.ready()).toBe(true);
    actor.set({ id: '13' });
    expect(api.concerns()).toEqual([]);
    expect(api.events()).toEqual([]);
    expect(api.contacts()).toEqual([]);
    expect(api.context()).toBeNull();
    expect(api.ready()).toBe(false);
  });
  it('uses separate request keys for identical concerns created as separate drafts', async () => {
    await api.load();
    const first = api.newConcern(),
      second = api.newConcern();
    for (const draft of [first, second]) {
      draft.title = 'Same title';
      draft.description = 'Same facts';
      expect(await api.saveConcern(draft)).toBeNull();
    }
    const calls = request.mock.calls.filter((c) => c[0].endsWith('/concerns') && c[2] === 'POST');
    expect(calls[0][3]!['Idempotency-Key']).not.toBe(calls[1][3]!['Idempotency-Key']);
  });
  it('allows the same note text again after a successful note while retaining uncertain retry keys', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection interrupted'));
    expect(await api.addNote('case-1', 'Follow-up checked')).toBe('Connection interrupted');
    expect(await api.addNote('case-1', 'Follow-up checked')).toBeNull();
    expect(await api.addNote('case-1', 'Follow-up checked')).toBeNull();
    const calls = request.mock.calls.filter((c) => c[0].endsWith('/notes'));
    expect(calls[0][3]!['Idempotency-Key']).toBe(calls[1][3]!['Idempotency-Key']);
    expect(calls[1][3]!['Idempotency-Key']).not.toBe(calls[2][3]!['Idempotency-Key']);
  });
  it('gives every close and reopen cycle its own versioned request key', async () => {
    let version = 1;
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, body, method, ...args) => {
      if (method === 'POST' && /transition|reopen/.test(path))
        return { ...row(), ...body, version: ++version, etag: '"v' + version + '"' };
      return normal(path, body, method, ...args);
    });
    await api.load();
    const draft = structuredClone(api.concerns()[0]);
    draft.outcome = 'Actions complete';
    for (const status of [
      'Resolved',
      'Closed',
      'Under investigation',
      'Resolved',
      'Closed',
      'Under investigation',
    ] as const) {
      draft.status = status;
      expect(await api.saveConcern(draft)).toBeNull();
    }
    const calls = request.mock.calls.filter((c) => /transition|reopen/.test(c[0]));
    expect(calls).toHaveLength(6);
    expect(new Set(calls.map((c) => c[3]!['Idempotency-Key'])).size).toBe(6);
  });
  it('uses the editor version for notes to prevent overwriting concurrent investigation changes', async () => {
    await api.load();
    await api.addNote('case-1', 'Version checked', [], '"v1"');
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, body, method, headers) => {
      if (path.endsWith('/notes') && headers?.['If-Match'] === '"v1"')
        throw Object.assign(Error('This record changed.'), { status: 412 });
      return normal(path, body, method, headers);
    });
    expect(await api.addNote('case-1', 'Stale editor finding', [], '"v1"')).toBe(
      'This record changed.',
    );
    const calls = request.mock.calls.filter((c) => c[0].endsWith('/notes'));
    expect(calls[1][3]!['If-Match']).toBe('"v1"');
  });
  it('discards delayed details after a refresh removes access to that concern', async () => {
    await api.load();
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.detail('case-1');
    const rejected = expect(pending).rejects.toThrow('changed');
    request
      .mockResolvedValueOnce(identity())
      .mockResolvedValueOnce({ company_id: 'north', next: null, results: [] });
    await api.load();
    finish(row());
    await rejected;
    expect(api.concerns()).toEqual([]);
  });
  it('retains the draft when a stale write is rejected', async () => {
    await api.load();
    const draft = structuredClone(api.concerns()[0]);
    draft.description = 'Unsaved findings';
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, body, method, ...args) => {
      if (method === 'PATCH')
        throw Object.assign(Error('This record changed. Reload it before saving.'), {
          status: 412,
        });
      return normal(path, body, method, ...args);
    });
    expect(await api.saveConcern(draft)).toContain('record changed');
    expect(draft.description).toBe('Unsaved findings');
    expect(draft.etag).toBe('"v1"');
  });
  it('clears records on revocation and recovers on retry', async () => {
    await api.load();
    request.mockRejectedValueOnce(
      Object.assign(Error('Record inactive'), { status: 403, code: 'staff_inactive' }),
    );
    await api.load();
    expect(api.concerns()).toEqual([]);
    expect(api.staffReady()).toBe(false);
    await api.load();
    expect(api.ready()).toBe(true);
  });
  it('discards a late old-workspace response', async () => {
    let finish!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const pending = api.load();
    company.set('south');
    finish(identity());
    await pending;
    expect(api.concerns()).toEqual([]);
    expect(api.staffReady()).toBe(false);
  });
});

describe('Staff investigation editor', () => {
  let api: any, fixture: any, editor: any, params: BehaviorSubject<any>;
  async function flush() {
    fixture.detectChanges();
    for (let i = 0; i < 15; i++) await Promise.resolve();
    fixture.detectChanges();
  }
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ concernId: 'case-1' }));
    const concern = {
      ...row(),
      evidence: [],
      checklist: [],
      notes: [],
    } as unknown as ConnectedConcern;
    api = {
      staffReady: signal(true),
      ready: signal(true),
      concerns: signal([concern]),
      events: signal([]),
      context: signal(identity()),
      start: vi.fn(),
      newConcern: () => ({ ...concern, id: 'new' }),
      detail: vi.fn().mockResolvedValue(concern),
      loadAudit: vi.fn().mockResolvedValue(undefined),
      busy: () => false,
      saveConcern: vi.fn().mockResolvedValue(null),
      addNote: vi.fn().mockResolvedValue(null),
      capabilities: () => ({ can_create: true }),
      email: () => identity().email,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StaffConcernsApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            snapshot: {
              paramMap: params.value,
              queryParamMap: convertToParamMap({ staff: 'other@example.test' }),
            },
          },
        },
      ],
    });
    TestBed.overrideComponent(PortalConcerns, { set: { template: '' } });
    fixture = TestBed.createComponent(PortalConcerns);
    editor = fixture.componentInstance;
  });
  it('opens a direct concern link after data is ready', async () => {
    await flush();
    expect(api.detail).toHaveBeenCalledWith('case-1');
    expect(editor.draft.id).toBe('case-1');
    expect(editor.editing()).toBe(true);
  });
  it('ignores a different staff selector and keeps the authorised list', async () => {
    await flush();
    expect(editor.concerns()).toHaveLength(1);
  });
  it('keeps a dirty draft and stops navigation while evidence is uploading', async () => {
    await flush();
    editor.uploading.set(true);
    expect(editor.canLeave()).toBe(false);
  });
  it('clears draft and comments when access is revoked', async () => {
    await flush();
    editor.draft.description = 'Private finding';
    editor.comment = 'Private comment';
    api.staffReady.set(false);
    await flush();
    expect(editor.editing()).toBe(false);
    expect(editor.comment).toBe('');
    expect(editor.draft.description).not.toBe('Private finding');
  });
  it('passes the draft version when adding a note and preserves unsaved findings on a conflict', async () => {
    await flush();
    editor.draft.description = 'Unsaved findings';
    editor.comment = 'New note';
    api.concerns.set([{ ...api.concerns()[0], etag: '"v9"' }]);
    api.addNote.mockResolvedValue('This record changed.');
    await editor.addNote();
    expect(api.addNote).toHaveBeenCalledWith('case-1', 'New note', [], '"v1"');
    expect(editor.draft.description).toBe('Unsaved findings');
    expect(editor.draft.etag).toBe('"v1"');
    expect(editor.comment).toBe('New note');
  });
  it('clears private drafts when refreshed visibility removes the selected concern', async () => {
    await flush();
    editor.draft.description = 'Private draft';
    editor.comment = 'Private note';
    api.detail.mockRejectedValue(Error('This concern is unavailable.'));
    api.concerns.set([]);
    await flush();
    expect(editor.comment).toBe('');
    expect(editor.draft.description).not.toBe('Private draft');
    expect(editor.editing()).toBe(false);
  });
  it('waits for direct-link detail loading before allowing edits', async () => {
    let finish!: (value: unknown) => void;
    api.detail.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await flush();
    expect(editor.detailLoading()).toBe(true);
    expect(editor.editing()).toBe(false);
    await editor.save();
    expect(api.saveConcern).not.toHaveBeenCalled();
    finish(api.concerns()[0]);
    await flush();
    expect(editor.detailLoading()).toBe(false);
    expect(editor.editing()).toBe(true);
  });
});
