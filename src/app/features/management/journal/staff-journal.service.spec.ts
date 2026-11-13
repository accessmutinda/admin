import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from '../staff-portal/staff-dashboard-api.service';
import { JournalService, STAFF_JOURNAL } from './journal.service';
import { StaffJournal } from './staff-journal';

const identity = () => ({
  company_id: 'north',
  actor_id: '12',
  person_id: 'staff',
  employment_id: 'employment',
  name: 'Linked Worker',
  email: 'worker@example.test',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
});
const row = () => ({
  id: 'entry',
  company_id: 'north',
  version: 1,
  etag: '"v1"',
  state_etag: '"v1"',
  author: 'Colleague',
  authorEmail: 'peer@example.test',
  is_author: false,
  to: ['worker@example.test'],
  cc: [],
  subject: 'Your care update',
  body: 'Recorded update',
  bodyHtml: '',
  clientId: '',
  visitId: '',
  replyToId: '',
  kind: 'Message',
  category: 'General',
  priority: 'Normal',
  responseRequired: false,
  responseStatus: '',
  state: 'Sent',
  createdAt: '2026-11-13T10:00:00Z',
  attachments: [],
  readBy: [],
  archivedBy: [],
  starredBy: [],
  followUpBy: [],
  deletedBy: [],
});

describe('Staff portal journal connection', () => {
  let service: JournalService, request: ReturnType<typeof vi.fn>;
  const company = signal('north'),
    actor = signal({ id: '12' }),
    tasks = signal(true);
  beforeEach(() => {
    company.set('north');
    actor.set({ id: '12' });
    tasks.set(true);
    request = vi.fn(async (path: string) => {
      if (path.endsWith('/context')) return identity();
      if (path.includes('/options?'))
        return {
          company_id: 'north',
          contacts: [],
          clients: [],
          visits: [],
          next_page: null,
          can_create: true,
          can_edit: true,
          can_export: true,
          external_delivery: false,
        };
      if (path.includes('/tasks?') || path.includes('/activity?'))
        return { company_id: 'north', count: 0, next_page: null, results: [] };
      return {
        count: 1,
        next: null,
        previous: null,
        results: [row()],
        meta: {
          company_id: 'north',
          folders: { Inbox: 1 },
          unread: 1,
          awaiting: 0,
          mentions: 0,
          local_date: '2026-11-13',
          as_of: '2026-11-13T10:00:00Z',
          request_id: 'read',
        },
      };
    });
    TestBed.configureTestingModule({
      imports: [StaffJournal],
      providers: [
        provideRouter([]),
        JournalService,
        { provide: STAFF_JOURNAL, useValue: true },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        {
          provide: AuthService,
          useValue: {
            api: request,
            profile: actor,
            currentUser: () => ({
              id: actor().id,
              email: 'worker@example.test',
              name: 'Worker',
              roleCode: 'CA',
            }),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => null,
            can: (m: string, s: string) => !(m === 'staff_portal' && s === 'tasks' && !tasks()),
          },
        },
        { provide: StaffDashboardApi, useValue: { rememberCompany: vi.fn() } },
      ],
    });
    service = TestBed.inject(JournalService);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('checks the staff identity before using private journal sources', async () => {
    expect(service.staffReady()).toBe(false);
    await service.connectStaff();
    await service.refresh();
    expect(service.staffReady()).toBe(true);
    expect(request.mock.calls[0][0]).toBe('/companies/north/staff-portal/journal/context');
    expect(service.entries()[0].subject).toBe('Your care update');
    expect(request.mock.calls.every((call) => call[0].includes('/staff-portal/journal'))).toBe(
      true,
    );
    expect(TestBed.inject(StaffDashboardApi).rememberCompany).toHaveBeenCalledWith(
      identity().company,
      '12',
    );
  });
  it('keeps journal loading independent of the task permission', async () => {
    tasks.set(false);
    await service.connectStaff();
    await service.refresh();
    expect(service.ready()).toBe(true);
    expect(service.tasksAllowed()).toBe(false);
    expect(request.mock.calls.some((call) => call[0].includes('/tasks?'))).toBe(false);
    expect(service.tasks()).toEqual([]);
  });
  it.each([
    { actor_id: 'other' },
    { company_id: 'south' },
    { person_id: '' },
    { employment_id: '' },
  ])('rejects inconsistent staff identity %o', async (change) => {
    request.mockResolvedValue({ ...identity(), ...change });
    await service.connectStaff();
    expect(service.staffReady()).toBe(false);
    expect(service.staffError()).toContain('current staff account');
    expect(service.entries()).toEqual([]);
  });
  it.each([
    ['staff_inactive', 'Your staff record is inactive'],
    ['staff_not_linked', 'Link your staff account to continue'],
  ])('renders the branded staff denial for %s', async (code, title) => {
    request.mockRejectedValue(
      Object.assign(Error('Ask your administrator to review your staff record.'), {
        status: 403,
        code,
      }),
    );
    await service.connectStaff();
    const fixture = TestBed.createComponent(StaffJournal);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(title);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'administrator',
    );
    expect(fixture.nativeElement.querySelector('.metrics')).toBeNull();
    fixture.destroy();
  });
  it('clears journal sources and actions after staff access is revoked', async () => {
    await service.connectStaff();
    await service.refresh();
    expect(service.entries()).toHaveLength(1);
    request.mockRejectedValue(
      Object.assign(Error('Staff access is inactive'), { status: 403, code: 'staff_inactive' }),
    );
    await service.refresh();
    expect(service.staffReady()).toBe(false);
    expect(service.staffCode()).toBe('staff_inactive');
    expect(service.entries()).toEqual([]);
    expect(service.detail()).toBeNull();
    expect(service.capabilities().can_create).toBe(false);
  });
  it('can retry an unavailable context without leaving the page', async () => {
    request.mockRejectedValueOnce(Error('Connection unavailable'));
    await service.connectStaff();
    expect(service.staffReady()).toBe(false);
    await service.connectStaff();
    await service.refresh();
    expect(service.staffReady()).toBe(true);
    expect(service.entries()).toHaveLength(1);
  });
  it('discards a context response from a previous workspace', async () => {
    let finish!: (v: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = service.connectStaff();
    company.set('south');
    TestBed.tick();
    finish(identity());
    await pending;
    expect(service.staffReady()).toBe(false);
    expect(service.entries()).toEqual([]);
  });
  it('waits for permissions before opening and marking a received deep link', async () => {
    await service.connectStaff();
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, {
      queryParamMap: convertToParamMap({ entry: 'entry' }),
    });
    const original = request.getMockImplementation()! as (path: string) => Promise<any>;
    let finish!: (value: any) => void,
      read = false;
    const received = () => ({
      ...row(),
      readBy: read ? ['worker@example.test'] : [],
      state_etag: read ? '"v2"' : '"v1"',
    });
    request.mockImplementation(async (path: string, body?: any) => {
      if (path.includes('/options?')) return new Promise((resolve) => (finish = resolve));
      if (path.endsWith('/entry/state')) {
        read = true;
        return received();
      }
      if (path.endsWith('/entry')) return received();
      const response = await original(path);
      if (path.includes('/journal?')) return { ...response, results: [received()] };
      return response;
    });
    const fixture = TestBed.createComponent(StaffJournal);
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    expect(request.mock.calls.some((call) => call[0].endsWith('/entry'))).toBe(false);
    finish({
      company_id: 'north',
      contacts: [{ email: 'peer@example.test', name: 'Colleague', role: 'Workspace member' }],
      clients: [],
      visits: [],
      next_page: null,
      can_create: true,
      can_edit: true,
      can_export: true,
      external_delivery: false,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(read).toBe(true);
    expect(request.mock.calls.filter((call) => call[0].includes('/options?'))).toHaveLength(1);
    fixture.destroy();
  });
});
