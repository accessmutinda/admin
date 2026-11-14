import { StaffClientsPortal } from './staff-clients-portal.service';
import { JournalService } from '../journal/journal.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { StaffClientsApi } from './staff-clients-api.service';
import { ProfessionalApi } from './professional-api.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { STAFF_CLIENTS } from './staff-clients-api.service';
const context = () => ({
  company_id: 'north',
  actor_id: '12',
  person_id: 'worker',
  employment_id: 'employment',
  name: 'Recorded Worker',
  email: 'worker@example.test',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
  timezone: 'Africa/Nairobi',
  local_date: '2026-11-13',
  available: { tasks: true, journal: false, communications: true },
  capabilities: { can_export: true },
});
const row = (id = 'client') => ({
  id,
  company_id: 'north',
  name: 'Assigned person',
  reference: 'SU-1',
  address: '1 Example Road',
  postcode: 'AB1',
  funding: 'Private',
  priority: 'High',
  active: true,
  details: { dob: '1950-01-01' },
  representative: { name: 'Next of kin' },
  riskFlags: [],
  photo_id: null,
});
const detail = () => ({
  company_id: 'north',
  clientId: 'client',
  record: {
    ...row(),
    file: {
      details: { dob: '1950-01-01' },
      sections: {},
      entries: {},
      contacts: [],
      updatedAt: '',
    },
  },
  available: context().available,
  tasks: [],
  journal: [],
  communications: [],
  concerns: [],
  calls: [],
  visits: [],
  activity: [],
});
describe('Staff service-user account boundaries', () => {
  let api: StaffClientsApi, request: ReturnType<typeof vi.fn>;
  const company = signal('north'),
    actor = signal({ id: '12' }),
    accessContext = signal<any>(null);
  beforeEach(() => {
    company.set('north');
    actor.set({ id: '12' });
    accessContext.set(null);
    request = vi.fn(async (path: string) => {
      if (path.endsWith('/context')) return context();
      if (path.includes('?page='))
        return { company_id: 'north', count: 1, next: null, previous: null, results: [row()] };
      if (path.endsWith('/client')) return detail();
      throw Error('Unexpected transport ' + path);
    });
    TestBed.configureTestingModule({
      providers: [
        StaffClientsApi,
        ProfessionalApi,
        StaffClientsPortal,
        { provide: JournalService, useValue: {} },
        { provide: STAFF_CLIENTS, useValue: true },
        { provide: ServiceUsersApi, useExisting: StaffClientsApi },
        { provide: AuthService, useValue: { profile: actor, api: request } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: accessContext, can: () => true },
        },
        { provide: StaffDashboardApi, useValue: { rememberCompany: vi.fn() } },
      ],
    });
    api = TestBed.inject(StaffClientsApi);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('loads only the staff directory and verifies identity before reading records', async () => {
    expect(api.ready()).toBe(false);
    expect(api.context()).toBeNull();
    await api.load();
    expect(api.ready()).toBe(true);
    expect(api.clients()[0].name).toBe('Assigned person');
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      '/companies/north/staff-portal/service-users/context',
      '/companies/north/staff-portal/service-users?page=1&page_size=100',
    ]);
  });
  it('rejects another actor context before requesting clinical data', async () => {
    request.mockResolvedValueOnce({ ...context(), actor_id: '13' });
    await api.load();
    expect(request).toHaveBeenCalledTimes(1);
    expect(api.clients()).toEqual([]);
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('staff account');
  });
  it('retains branded inactive and unlinked errors without stale records', async () => {
    await api.load();
    request.mockRejectedValueOnce(
      Object.assign(Error('Your staff record is inactive.'), {
        status: 403,
        code: 'staff_inactive',
      }),
    );
    await api.load();
    expect(api.clients()).toEqual([]);
    expect(api.context()).toBeNull();
    expect(api.ready()).toBe(false);
    expect(api.code()).toBe('staff_inactive');
    expect(api.loading()).toBe(false);
  });
  it('hides private data immediately when the actor or company changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.clients()).toEqual([]);
    expect(api.context()).toBeNull();
    expect(api.ready()).toBe(false);
  });
  it('ignores request metadata changes but clears access after permission changes', async () => {
    accessContext.set({
      company_active: true,
      platform: 'care',
      revision: '1',
      permissions: ['a'],
      enabled_modules: ['care'],
      roles: [],
      request_id: 'first',
    });
    await api.load();
    const scope = api.scope();
    accessContext.update((c) => ({ ...c, request_id: 'second' }));
    expect(api.scope()).toBe(scope);
    expect(api.ready()).toBe(true);
    accessContext.update((c) => ({ ...c, permissions: [] }));
    expect(api.ready()).toBe(false);
    expect(api.clients()).toEqual([]);
  });
  it('loads a profile from the same staff scope and maps existing clinical fields', async () => {
    await api.detail('client');
    expect(api.ready()).toBe(true);
    expect(api.snapshot()?.clientId).toBe('client');
    expect(api.clients()[0].file?.details['dob']).toBe('1950-01-01');
    expect(api.available('journal')).toBe(false);
  });
  it('clears the directory and profile when an assignment is revoked', async () => {
    await api.detail('client');
    request.mockImplementation(async (path: string) => {
      if (path.endsWith('/context')) return context();
      if (path.includes('?page=')) return { company_id: 'north', next: null, results: [] };
      throw Object.assign(Error('No longer assigned'), { status: 404 });
    });
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.snapshot()).toBeNull();
    expect(api.clients()).toEqual([]);
    expect(api.error()).toBe('No longer assigned');
  });
  it('rejects mismatched company pages instead of displaying them', async () => {
    request
      .mockResolvedValueOnce(context())
      .mockResolvedValueOnce({ company_id: 'south', next: null, results: [row()] });
    await api.load();
    expect(api.clients()).toEqual([]);
    expect(api.error()).toContain('workspace');
  });
  it('discards responses which arrive after an account switch', async () => {
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const loading = api.load();
    company.set('south');
    finish(context());
    await loading;
    expect(api.clients()).toEqual([]);
    expect(api.context()).toBeNull();
  });
  it('uses staff-scoped professional transports', async () => {
    const professional = TestBed.inject(ProfessionalApi);
    request.mockResolvedValueOnce({
      company_id: 'north',
      clientId: 'client',
      records: [],
      contacts: [],
    });
    await professional.load('client', new URLSearchParams());
    expect(request.mock.calls[0][0]).toBe(
      '/companies/north/staff-portal/service-users/client/professional-communications?',
    );
  });
  it('refreshes shared profile data immediately after a professional communication is saved', async () => {
    await api.detail('client');
    const professional = TestBed.inject(ProfessionalApi);
    request.mockResolvedValueOnce({ company_id: 'north', clientId: 'client', id: 'record' });
    const refresh = vi.spyOn(api, 'detail');
    await professional.save('client', {} as any, null, 'new-record');
    expect(refresh).toHaveBeenCalledWith('client', true);
    expect(api.ready()).toBe(true);
  });
  it('forces a fresh profile read instead of reusing an older in-flight refresh', async () => {
    await api.detail('client');
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const old = api.load();
    await api.detail('client', true);
    finish({ ...context(), name: 'Stale response' });
    await old;
    expect(api.context()?.name).toBe('Recorded Worker');
    expect(api.snapshot()?.clientId).toBe('client');
  });
  it('uses existing contact names in the audit and does not invent a response requirement', async () => {
    const profile = detail();
    profile.record.file.contacts = [{ id: 'contact', name: 'Community Nurse' }] as any;
    profile.communications = [
      {
        id: 'record',
        company_id: 'north',
        clientId: 'client',
        contactId: 'contact',
        type: 'Phone call',
        status: 'Open',
        direction: 'Received',
        responseStatus: '',
        responseRequired: false,
        attachments: [],
        at: '2026-11-13T10:00:00Z',
      },
    ] as any;
    const normal = request.getMockImplementation()! as (
      path: string,
      ...args: any[]
    ) => Promise<any>;
    request.mockImplementation(async (path, ...args) =>
      path.endsWith('/client') ? profile : normal(path, ...args),
    );
    await api.detail('client');
    const portal = TestBed.inject(StaffClientsPortal);
    expect(portal.communications()[0].responseStatus).toBeUndefined();
    expect(portal.clientTimeline('client')[0].recipient).toBe('Community Nurse');
  });
  it('keeps the same idempotency key when retrying an uncertain allocation', async () => {
    request
      .mockRejectedValueOnce(Error('Connection interrupted'))
      .mockRejectedValueOnce(Error('Connection interrupted'));
    await api.allocation('client', { reason: 'Own care' });
    await api.allocation('client', { reason: 'Own care' });
    expect(request.mock.calls[0][3]['Idempotency-Key']).toBe(
      request.mock.calls[1][3]['Idempotency-Key'],
    );
  });
  it('stops polling and clears records on exit, then reconnects when reopened', async () => {
    vi.useFakeTimers();
    try {
      api.start();
      await api.load();
      expect(api.ready()).toBe(true);
      api.stop();
      const count = request.mock.calls.length;
      expect(api.context()).toBeNull();
      expect(api.clients()).toEqual([]);
      await vi.advanceTimersByTimeAsync(45000);
      accessContext.set({
        company_active: true,
        platform: false,
        revision: 2,
        permissions: ['staff_portal.clients.read'],
        core_permissions: [],
        enabled_modules: ['staff_portal'],
        roles: [],
      });
      TestBed.tick();
      expect(request).toHaveBeenCalledTimes(count);
      api.start();
      await api.load();
      expect(api.ready()).toBe(true);
      expect(request.mock.calls.length).toBeGreaterThan(count);
      api.stop();
    } finally {
      vi.useRealTimers();
    }
  });
  it('ignores an identity response that arrives after the view has closed', async () => {
    let resolve!: (value: any) => void;
    request.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const pending = api.load();
    api.stop();
    resolve(context());
    await pending;
    expect(api.context()).toBeNull();
    expect(api.clients()).toEqual([]);
    expect(api.ready()).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
