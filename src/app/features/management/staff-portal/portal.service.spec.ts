import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { JournalService, STAFF_TASKS } from '../journal/journal.service';
import { StaffTasksPortal } from './staff-tasks-portal.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { PortalService } from './portal.service';

describe('Staff portal persisted workflows', () => {
  const email = 'worker@example.test';
  let portal: StaffTasksPortal, journal: JournalService, dashboard: StaffDashboardApi;
  let rows: any[], api: ReturnType<typeof vi.fn>, available: boolean;
  const company = signal('north');
  const identity = () => ({
    company_id: 'north',
    actor_id: '12',
    person_id: 'worker',
    employment_id: 'employment',
    name: 'Recorded worker',
    email,
    local_date: '2026-11-15',
    timezone: 'Europe/London',
    company: { id: 'north', name: 'North Care', code: 'NORTH' },
    profile: { role: 'Care Worker', reference: 'W1', status: 'Active' },
  });
  beforeEach(() => {
    rows = [];
    available = true;
    company.set('north');
    api = vi.fn(async (path: string, body?: any, method?: string, headers?: any) => {
      if (!available)
        throw Object.assign(Error('Your staff record is inactive.'), {
          status: 403,
          code: 'staff_inactive',
        });
      if (path.endsWith('/context')) return identity();
      if (path.includes('/options?'))
        return {
          company_id: 'north',
          contacts: [{ name: 'Recorded worker', email, role: 'Carer' }],
          clients: [],
          visits: [],
          next_page: null,
          can_create: true,
          can_edit: true,
          can_export: false,
        };
      if (path.endsWith('/dashboard'))
        return {
          ...identity(),
          staff: { id: 'worker', employment_id: 'employment', name: 'Recorded worker', email },
          meta: {
            local_date: '2026-11-15',
            timezone: 'Europe/London',
            available: { tasks: true },
            unavailable: [],
          },
          metrics: { open_tasks: rows.filter((r) => r.status !== 'Resolved').length },
          tasks: structuredClone(rows),
          inbox: [],
          clients: [],
          visits: [],
          activity: [],
          training: null,
        };
      if (method === 'POST' || method === 'PATCH') {
        if (body.owner !== email)
          throw Object.assign(Error('Task belongs to another staff account.'), { status: 403 });
        if (body.status === 'Resolved' && !body.actions.trim())
          throw Object.assign(Error('Record the action taken.'), { status: 400 });
        const previous = method === 'PATCH' ? rows.find((r) => path.endsWith('/' + r.id)) : null;
        if (previous && headers?.['If-Match'] !== previous.etag)
          throw Object.assign(Error('This task changed. Reload before saving.'), { status: 409 });
        const version = (previous?.version ?? 0) + 1;
        const saved = {
          ...body,
          id: previous?.id ?? 'task-' + (rows.length + 1),
          company_id: 'north',
          version,
          etag: '"v' + version + '"',
          attachments: [],
          resolvedAt: body.status === 'Resolved' ? '2026-11-15T12:00:00Z' : null,
        };
        rows = [...rows.filter((r) => r.id !== saved.id), saved];
        return structuredClone(saved);
      }
      if (path.includes('/tasks?'))
        return {
          company_id: 'north',
          count: rows.length,
          next_page: null,
          results: structuredClone(rows),
        };
      throw Error('Unexpected request ' + path);
    });
    TestBed.configureTestingModule({
      providers: [
        StaffTasksPortal,
        JournalService,
        StaffDashboardApi,
        { provide: PortalService, useExisting: StaffTasksPortal },
        { provide: STAFF_TASKS, useValue: true },
        {
          provide: AuthService,
          useValue: {
            api,
            profile: () => ({ id: '12' }),
            currentUser: () => ({ email, name: 'Recorded worker' }),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: () => null, can: () => true },
        },
      ],
    });
    portal = TestBed.inject(PortalService) as unknown as StaffTasksPortal;
    journal = TestBed.inject(JournalService);
    dashboard = TestBed.inject(StaffDashboardApi);
  });
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('keeps task creation resolution and reopening consistent with dashboard reads', async () => {
    await journal.refresh();
    const draft = { ...portal.newTask(), title: 'Review support handover' };
    expect(await portal.saveTask(draft)).toBeNull();
    await dashboard.load();
    expect(portal.tasks()[0].title).toBe(draft.title);
    expect(dashboard.metric('open_tasks')).toBe(1);
    const resolved = {
      ...portal.tasks()[0],
      status: 'Resolved' as const,
      actions: 'Support confirmed.',
    };
    expect(await portal.saveTask(resolved)).toBeNull();
    await dashboard.load();
    expect(dashboard.metric('open_tasks')).toBe(0);
    expect(portal.tasks()[0].resolvedAt).toBeTruthy();
    expect(await portal.saveTask({ ...portal.tasks()[0], status: 'Open' })).toBeNull();
    await dashboard.load();
    expect(dashboard.metric('open_tasks')).toBe(1);
    expect(portal.tasks()[0].resolvedAt).toBeFalsy();
  });
  it('preserves an open task when resolution evidence is rejected', async () => {
    await journal.refresh();
    const draft = { ...portal.newTask(), title: 'Review support' };
    await portal.saveTask(draft);
    expect(
      await portal.saveTask({ ...portal.tasks()[0], status: 'Resolved', actions: '' }),
    ).toContain('action taken');
    await journal.refresh();
    expect(portal.tasks()[0].status).toBe('Open');
  });
  it('does not overwrite a newer task with a stale editor version', async () => {
    await journal.refresh();
    await portal.saveTask({ ...portal.newTask(), title: 'Review support' });
    const stale = structuredClone(portal.tasks()[0]);
    await portal.saveTask({ ...portal.tasks()[0], notes: 'Newer confirmed handover' });
    expect(await portal.saveTask({ ...stale, notes: 'Old editor content' })).toContain('changed');
    await journal.refresh();
    expect(portal.tasks()[0].notes).toBe('Newer confirmed handover');
  });
  it('does not show browser-owned records when the server returns an empty staff account', async () => {
    localStorage.setItem(
      'cv_staff_portal',
      JSON.stringify({ tasks: [{ title: 'Unverified private task' }] }),
    );
    await journal.refresh();
    await dashboard.load();
    expect(portal.tasks()).toEqual([]);
    expect(dashboard.metric('open_tasks')).toBe(0);
    expect(portal.store.company()?.id).toBe('north');
  });
  it('clears staff records after revocation and recovers from a fresh authorised read', async () => {
    await journal.refresh();
    await portal.saveTask({ ...portal.newTask(), title: 'Review support' });
    available = false;
    await journal.refresh();
    await dashboard.load();
    expect(portal.tasks()).toEqual([]);
    expect(journal.staffReady()).toBe(false);
    expect(dashboard.snapshot()).toBeNull();
    available = true;
    await journal.refresh();
    await dashboard.load();
    expect(portal.tasks()).toHaveLength(1);
    expect(dashboard.metric('open_tasks')).toBe(1);
  });
});
