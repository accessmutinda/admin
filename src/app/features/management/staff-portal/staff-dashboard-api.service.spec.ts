import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { AcademyService } from '../learning/academy/academy.service';
import { PortalService } from './portal.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { PortalDashboard } from './portal-dashboard';

const response = () => ({
  company_id: 'north',
  actor_id: '12',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
  staff: {
    id: 'worker',
    employment_id: 'employment',
    name: 'Recorded Worker',
    email: 'worker@example.test',
  },
  meta: {
    local_date: '2026-11-13',
    timezone: 'Africa/Nairobi',
    as_of: '2026-11-13T12:00:00Z',
    available: { tasks: true, journal: true, visits: true },
    unavailable: [],
  },
  metrics: {
    open_tasks: 2,
    overdue_tasks: 1,
    due_this_week: 2,
    visits: 1,
    completed_visits: 1,
    pending_visits: 0,
    concerns: null,
    awaiting: 0,
  },
  tasks: [
    {
      id: 'own-task',
      owner: 'worker@example.test',
      assignedBy: 'manager@example.test',
      title: 'My recorded action',
      clientId: '',
      due: '2026-11-13',
      dueTime: '',
      status: 'Open',
      priority: 'High',
      shared: true,
      notes: '',
      actions: '',
      createdAt: '2026-11-13T10:00:00Z',
      resolvedAt: null,
      attachments: [],
    },
  ],
  inbox: [],
  visits: [
    {
      id: 'visit',
      clientId: 'patient',
      date: '2026-11-13',
      staffIds: ['worker'],
      state: 'Completed',
    },
  ],
  clients: [{ id: 'patient', name: 'Assigned person' }],
  activity: [],
  training: {
    assigned: 1,
    due: 1,
    evidence_pending: 0,
    attention: [
      {
        id: 'assignment',
        courseId: 'course',
        title: 'Assigned course',
        due: '2026-11-12',
        status: 'Overdue',
      },
    ],
  },
  can_compose: false,
});

describe('Staff dashboard account boundary', () => {
  let api: StaffDashboardApi,
    request: ReturnType<typeof vi.fn>,
    company: ReturnType<typeof signal<string>>,
    profile: ReturnType<typeof signal<any>>,
    context: ReturnType<typeof signal<any>>;
  beforeEach(() => {
    company = signal('north');
    profile = signal({ id: '12' });
    context = signal({ revision: 1 });
    request = vi.fn(async () => response());
    TestBed.configureTestingModule({
      imports: [PortalDashboard],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            api: request,
            profile,
            currentUser: () => ({
              id: '12',
              name: 'Recorded Worker',
              email: 'worker@example.test',
              roleCode: 'CA',
            }),
            signOut: vi.fn(),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context, can: () => true, canPath: () => true },
        },
        { provide: PortalService, useExisting: StaffDashboardApi },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Dashboard must not construct browser workspace records');
          },
        },
        {
          provide: AcademyService,
          useFactory: () => {
            throw Error('Dashboard must not construct browser learning records');
          },
        },
      ],
    });
    TestBed.inject(ActivatedRoute).snapshot.data = { portalView: 'dashboard' };
    api = TestBed.inject(StaffDashboardApi);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('requests the authenticated staff dashboard without a supplied staff identity', async () => {
    await api.load();
    expect(request.mock.calls[0][0]).toBe('/companies/north/staff-portal/dashboard');
    expect(api.snapshot()?.staff.employment_id).toBe('employment');
    expect(api.metric('concerns')).toBeNull();
    expect(api.tasks()[0].id).toBe('own-task');
  });
  it('immediately hides old account data before scope effects run', async () => {
    await api.load();
    profile.set({ id: '13' });
    expect(api.snapshot()).toBeNull();
    expect(api.tasks()).toEqual([]);
    expect(api.company()).toBeNull();
    expect(api.training()).toBeNull();
  });
  it('preserves the dashboard when only access response metadata changes', async () => {
    await api.load();
    context.set({ revision: 1, request_id: 'new-request' });
    expect(api.snapshot()?.staff.id).toBe('worker');
  });
  it('discards late responses after a company or account change', async () => {
    let finish!: (data: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = api.load();
    company.set('south');
    finish(response());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
  it('rejects an authenticated response for another account', async () => {
    request.mockResolvedValueOnce({ ...response(), actor_id: '13' });
    await api.load();
    expect(api.snapshot()).toBeNull();
    expect(api.error()).toContain('current staff account');
  });
  it('clears data when the server reports an inactive staff record', async () => {
    await api.load();
    request.mockRejectedValueOnce(
      Object.assign(new Error('Your staff record is not active. Contact your manager.'), {
        code: 'staff_inactive',
        status: 403,
      }),
    );
    await api.load();
    expect(api.snapshot()).toBeNull();
    expect(api.code()).toBe('staff_inactive');
  });
  it('does not repopulate private records after leaving the page', async () => {
    let finish!: (data: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    api.start();
    api.stop();
    finish(response());
    await Promise.resolve();
    await Promise.resolve();
    expect(api.snapshot()).toBeNull();
    expect(api.loading()).toBe(false);
  });
  it('renders existing cards with server totals and only personal visits for an administrator', async () => {
    const fixture = TestBed.createComponent(PortalDashboard);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.portal-stat-row .metric')).toHaveLength(4);
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('My recorded action');
    expect(text).toContain('Assigned course');
    expect(text).toContain('Today’s Visits');
    expect((fixture.componentInstance as any).timestamp('2026-11-13T12:00:00Z', 'time')).toBe(
      '15:00',
    );
    expect(text).not.toContain('Today’s Team Visits');
    expect(fixture.nativeElement.querySelector('.portal-stat-row strong').textContent).toContain(
      '2',
    );
    expect(fixture.nativeElement.querySelector('button[disabled]')?.textContent).toContain(
      'All Team Tasks',
    );
    fixture.destroy();
  });
  it.each([
    ['staff_not_linked', 'Link your staff account to continue'],
    ['staff_inactive', 'Your staff record is inactive'],
  ])('renders a branded %s state without private cards or composer', async (code, title) => {
    request.mockRejectedValue(
      Object.assign(new Error('Contact your manager to review your staff account.'), {
        code,
        status: 403,
      }),
    );
    const fixture = TestBed.createComponent(PortalDashboard);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(title);
    });
    expect(fixture.nativeElement.querySelector('.portal-stat-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('cv-staff-journal')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain(
      'Contact your manager',
    );
    expect(fixture.nativeElement.textContent).toContain('Try again');
    expect(fixture.nativeElement.textContent).toContain('Account & support');
    fixture.destroy();
  });
});
