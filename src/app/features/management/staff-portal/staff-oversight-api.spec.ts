import { BehaviorSubject } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { PortalService } from './portal.service';
import { PortalDashboard } from './portal-dashboard';
import { StaffOversightApi } from './staff-oversight-api.service';
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
    available: { tasks: true, journal: true, communications: true, concerns: true },
    unavailable: [],
  },
  metrics: {
    open_tasks: 3,
    overdue_tasks: 1,
    due_this_week: 2,
    concerns: 1,
    professional_awaiting: 7,
    overdue_followups: 4,
    visits: 99,
    awaiting: 99,
  },
  tasks: [
    {
      id: 'task',
      owner: 'worker@example.test',
      title: 'My reviewed action',
      clientId: 'client',
      due: '2026-11-12',
      priority: 'High',
      status: 'Open',
      notes: 'Follow up',
      attachments: [],
    },
  ],
  inbox: [],
  clients: [{ id: 'client', name: 'Assigned client' }],
  visits: [],
  activity: [],
  training: null,
  can_compose: false,
  concerns: [],
  communications: [],
  mini_stats: {
    open_client_journals: 2,
    staff_awaiting_review: 3,
    district_nurse_responses: 7,
    gp_notes_received: 6,
    social_worker_followups: 1,
    resolved_this_week: 8,
  },
  summaries: {
    'This Week': [{ name: 'Journal', count: 5, color: '#123456' }],
    'Last Week': [{ name: 'Journal', count: 2, color: '#123456' }],
  },
  statuses: [{ name: 'Open', count: 3, percent: 100, color: '#123456' }],
  task_total: 3,
});
describe('Staff manager oversight connection', () => {
  let api: StaffOversightApi, request: ReturnType<typeof vi.fn>;
  const actor = signal({ id: '12' }),
    company = signal('north');
  beforeEach(() => {
    actor.set({ id: '12' });
    company.set('north');
    request = vi.fn(async () => response());
    TestBed.configureTestingModule({
      imports: [PortalDashboard],
      providers: [
        provideRouter([]),
        StaffOversightApi,
        { provide: PortalService, useExisting: StaffOversightApi },
        {
          provide: AuthService,
          useValue: {
            profile: actor,
            currentUser: () => ({ email: 'worker@example.test', roleCode: 'CA' }),
            api: request,
            signOut: vi.fn(),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: () => null, can: () => true },
        },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Oversight must not construct demo workspace records');
          },
        },
      ],
    });
    TestBed.inject(ActivatedRoute).snapshot.data = { portalView: 'oversight' };
    api = TestBed.inject(StaffOversightApi);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('requests the current staff oversight endpoint without an employee selector', async () => {
    await api.load();
    expect(request.mock.calls[0][0]).toBe('/companies/north/staff-portal/oversight');
    expect(api.snapshot()?.staff.id).toBe('worker');
    expect(api.contacts()).toEqual([{ name: 'Recorded Worker', email: 'worker@example.test' }]);
  });
  it('uses the correct manager metrics and backend summaries in the existing screen', async () => {
    const fixture = TestBed.createComponent(PortalDashboard);
    await api.load();
    fixture.detectChanges();
    const dashboard: any = fixture.componentInstance;
    expect(dashboard.manager).toBe(true);
    expect(dashboard.miniStats()[0].count).toBe(2);
    expect(dashboard.summary()[0].count).toBe(5);
    dashboard.period.set('Last Week');
    expect(dashboard.summary()[0].count).toBe(2);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Awaiting Response from Professionals');
    expect(text).toContain('7');
    expect(text).not.toContain('99');
    expect(text).toContain('My reviewed action');
    fixture.destroy();
  });
  it('resets every drill-down control without widening the data source', async () => {
    const fixture = TestBed.createComponent(PortalDashboard);
    await api.load();
    fixture.detectChanges();
    const dashboard: any = fixture.componentInstance;
    dashboard.drillClient.set('another-client');
    dashboard.drillStaff.set('other@example.test');
    dashboard.drillStatus.set('Resolved');
    dashboard.from.set('2026-01-01');
    dashboard.applied.set(true);
    expect(dashboard.queue()).toEqual([]);
    dashboard.resetDrill();
    expect(dashboard.drillClient()).toBe('');
    expect(dashboard.drillStaff()).toBe('');
    expect(dashboard.from()).toBe('');
    expect(dashboard.queue()).toHaveLength(1);
    fixture.destroy();
  });
  it('does not treat professional record dates as overdue deadlines', async () => {
    request.mockResolvedValue({
      ...response(),
      communications: [
        {
          id: 'record',
          clientId: 'client',
          loggedByEmail: 'worker@example.test',
          subject: 'No follow-up deadline',
          details: 'Recorded update',
          type: 'GP note',
          status: 'Open',
          at: '2025-01-01T10:00:00Z',
          followUp: null,
        },
      ],
    });
    const fixture = TestBed.createComponent(PortalDashboard);
    await api.load();
    fixture.detectChanges();
    const dashboard: any = fixture.componentInstance;
    expect(dashboard.queue().find((r: any) => r.id === 'record').due).toBe('');
    dashboard.scope.set('Overdue');
    expect(dashboard.queue().some((r: any) => r.id === 'record')).toBe(false);
    fixture.destroy();
  });
  it('expands the permitted oversight activity without opening another data source', async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    vi.spyOn(TestBed.inject(ActivatedRoute), 'queryParamMap', 'get').mockReturnValue(params);
    request.mockResolvedValue({
      ...response(),
      activity: Array.from({ length: 8 }, (_, i) => ({
        id: 'event-' + i,
        entityId: 'task',
        clientId: '',
        actor: 'Recorded Worker',
        action: 'Recorded action',
        detail: 'Own authorised activity',
        at: '2026-11-13T10:00:00Z',
        category: 'Task',
        status: 'Recorded',
      })),
    });
    const fixture = TestBed.createComponent(PortalDashboard);
    await api.load();
    fixture.detectChanges();
    const dashboard: any = fixture.componentInstance;
    expect(dashboard.activity()).toHaveLength(6);
    params.next(convertToParamMap({ activity: 'all' }));
    fixture.detectChanges();
    expect(dashboard.activity()).toHaveLength(8);
    expect(
      fixture.nativeElement.querySelector('a[href="/staff-portal/oversight?activity=all"]'),
    ).not.toBeNull();
    fixture.destroy();
  });
  it('finds descriptions and excludes undated records from an end-date-only drill-down', async () => {
    request.mockResolvedValue({
      ...response(),
      communications: [
        {
          id: 'record',
          clientId: 'client',
          loggedByEmail: 'worker@example.test',
          subject: 'Professional update',
          details: 'Unique reviewed wound findings',
          type: 'GP note',
          status: 'Open',
          at: '2025-01-01T10:00:00Z',
          followUp: null,
        },
      ],
    });
    const fixture = TestBed.createComponent(PortalDashboard);
    await api.load();
    fixture.detectChanges();
    const dashboard: any = fixture.componentInstance;
    dashboard.query.set('wound findings');
    expect(dashboard.queue().map((r: any) => r.id)).toEqual(['record']);
    dashboard.query.set('');
    dashboard.to.set('2026-11-13');
    dashboard.applied.set(true);
    expect(dashboard.queue().map((r: any) => r.id)).toEqual(['task']);
    fixture.destroy();
  });
  it('hides all oversight records immediately when the logged-in account changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.snapshot()).toBeNull();
    expect(api.tasks()).toEqual([]);
    expect(api.communications()).toEqual([]);
    expect(api.concerns()).toEqual([]);
  });
  it.each(['staff_inactive', 'staff_not_linked'])(
    'shows the branded %s state without private dashboard values',
    async (code) => {
      request.mockRejectedValue(
        Object.assign(Error('Contact your administrator to review the staff account.'), {
          code,
          status: 403,
        }),
      );
      const fixture = TestBed.createComponent(PortalDashboard);
      await api.load();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.portal-stat-row')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
        'Contact your administrator',
      );
      expect(api.code()).toBe(code);
      fixture.destroy();
    },
  );
  it('rejects another staff owner returned in the oversight payload', async () => {
    request.mockResolvedValue({
      ...response(),
      tasks: [{ ...response().tasks[0], owner: 'other@example.test' }],
    });
    await api.load();
    expect(api.snapshot()).toBeNull();
    expect(api.error()).toContain('does not match');
  });
});
