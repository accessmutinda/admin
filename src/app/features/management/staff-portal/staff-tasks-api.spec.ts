import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { JournalService, STAFF_TASKS } from '../journal/journal.service';
import { StaffTasksPortal } from './staff-tasks-portal.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { JournalTask } from '../journal/journal.models';

const context = () => ({
  company_id: 'north',
  actor_id: '12',
  person_id: 'person',
  employment_id: 'employment',
  name: 'Linked Worker',
  email: 'worker@example.test',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
  local_date: '2026-11-13',
  awaiting_replies: null,
  profile: {
    role: 'Carer',
    reference: 'STAFF-1',
    status: 'Active',
    location: 'North branch',
    start: '2025-01-01',
    employment_type: 'Full Time',
    manager: 'Team Manager',
    phone: '01234567890',
  },
});
const task = (id = 'task-1'): JournalTask & { company_id: string } => ({
  id,
  company_id: 'north',
  owner: 'worker@example.test',
  assignedBy: 'manager@example.test',
  title: 'Follow up',
  due: '2026-11-13',
  priority: 'Normal',
  status: 'Open',
  shared: true,
  notes: 'Recorded task',
  actions: '',
  clientId: '',
  attachments: [],
  etag: '"v1"',
});
describe('Staff tasks API connection', () => {
  let service: JournalService,
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
  const company = signal('north'),
    actor = signal({ id: '12' });
  beforeEach(() => {
    company.set('north');
    actor.set({ id: '12' });
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/context')) return context();
      if (path.includes('/options?'))
        return {
          company_id: 'north',
          contacts: [{ name: 'Linked Worker', email: 'worker@example.test', role: 'Carer' }],
          clients: [],
          visits: [],
          next_page: null,
          can_create: true,
          can_edit: true,
          can_export: true,
          external_delivery: false,
        };
      if (method === 'POST' || method === 'PATCH') return { ...task(), ...body, etag: '"v2"' };
      if (path.includes('/tasks?'))
        return { company_id: 'north', count: 1, next_page: null, results: [task()] };
      if (path.endsWith('/task-1')) return task();
      throw Error('Unexpected transport ' + path);
    });
    TestBed.configureTestingModule({
      providers: [
        StaffTasksPortal,
        JournalService,
        { provide: STAFF_TASKS, useValue: true },
        {
          provide: AuthService,
          useValue: {
            api: request,
            profile: actor,
            currentUser: () => ({ email: 'worker@example.test', name: 'Account Name' }),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => null,
            can: (module: string, sub: string) => sub !== 'journal',
          },
        },
        { provide: StaffDashboardApi, useValue: { rememberCompany: vi.fn() } },
      ],
    });
    service = TestBed.inject(JournalService);
  });
  it('loads own employment and tasks without journal or dashboard permission', async () => {
    await service.refresh();
    expect(service.allowed()).toBe(true);
    expect(service.staffReady()).toBe(true);
    expect(service.staffContext()?.name).toBe('Linked Worker');
    expect(service.staffContext()?.profile.reference).toBe('STAFF-1');
    expect(service.staffContext()?.awaiting_replies).toBeNull();
    expect(service.tasks()).toHaveLength(1);
    expect(service.summary().local_date).toBe('2026-11-13');
    expect(
      request.mock.calls.every(
        (call) => !call[0].includes('/journal') && !call[0].includes('/dashboard'),
      ),
    ).toBe(true);
    expect(request.mock.calls[0][0]).toBe('/companies/north/staff-portal/tasks/context');
  });
  it('fetches all authorised task pages for complete status filters and totals', async () => {
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (...args: any[]) => {
      const path = args[0] as string;
      if (path.includes('/tasks?page=1'))
        return { company_id: 'north', next_page: 2, results: [task()] };
      if (path.includes('/tasks?page=2'))
        return { company_id: 'north', next_page: null, results: [task('task-2')] };
      return normal(args[0], args[1], args[2]);
    });
    await service.refresh();
    expect(service.tasks().map((t) => t.id)).toEqual(['task-1', 'task-2']);
  });
  it('creates and updates through task routes with idempotency and version headers', async () => {
    await service.refresh();
    const draft = { ...task(), id: 'new-task', etag: undefined };
    expect(await service.saveTask(draft)).toBeNull();
    const create = request.mock.calls.find((call) => call[2] === 'POST')!;
    expect(create[0]).toBe('/companies/north/staff-portal/tasks');
    expect(create[3]).toHaveProperty('Idempotency-Key');
    expect(
      await service.saveTask({ ...task(), status: 'Resolved', actions: 'Follow-up completed' }),
    ).toBeNull();
    const edit = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(edit[0]).toBe('/companies/north/staff-portal/tasks/task-1');
    expect(edit[3]).toEqual({ 'If-Match': '"v1"' });
  });
  it('rejects a task response for another staff account', async () => {
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (...args: any[]) =>
      args[0].includes('/tasks?')
        ? {
            company_id: 'north',
            next_page: null,
            results: [{ ...task(), owner: 'other@example.test' }],
          }
        : normal(args[0], args[1], args[2]),
    );
    await service.refresh();
    expect(service.ready()).toBe(false);
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toContain('does not belong');
  });
  it.each(['staff_inactive', 'staff_not_linked'])(
    'shows %s without querying tasks',
    async (code) => {
      request.mockRejectedValue(
        Object.assign(Error('Staff access unavailable'), { status: 403, code }),
      );
      await service.refresh();
      expect(service.staffReady()).toBe(false);
      expect(service.staffCode()).toBe(code);
      expect(service.tasks()).toEqual([]);
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it('clears tasks and identity when access is revoked after a successful read', async () => {
    await service.refresh();
    request.mockRejectedValue(
      Object.assign(Error('Staff record inactive'), { status: 403, code: 'staff_inactive' }),
    );
    await service.refresh();
    expect(service.staffReady()).toBe(false);
    expect(service.tasks()).toEqual([]);
    expect(service.contacts()).toEqual([]);
    expect(service.capabilities().can_edit).toBe(false);
  });
  it('recovers after retrying a failed staff identity check', async () => {
    request.mockRejectedValueOnce(
      Object.assign(Error('Staff record inactive'), { status: 403, code: 'staff_inactive' }),
    );
    await service.refresh();
    await service.refresh();
    expect(service.ready()).toBe(true);
    expect(service.staffCode()).toBe('');
  });
  it('discards a late task response after switching workspaces', async () => {
    const normal = request.getMockImplementation()!;
    let finish!: (value: unknown) => void;
    request.mockImplementation(async (...args: any[]) =>
      args[0].includes('/tasks?')
        ? new Promise((resolve) => (finish = resolve))
        : normal(args[0], args[1], args[2]),
    );
    const pending = service.refresh();
    for (let i = 0; i < 12; i++) await Promise.resolve();
    company.set('south');
    finish({ company_id: 'north', next_page: null, results: [task()] });
    await pending;
    TestBed.tick();
    expect(service.tasks()).toEqual([]);
    expect(service.staffReady()).toBe(false);
  });
  it('provides the task screen from the connected self-service source', async () => {
    const portal = TestBed.inject(StaffTasksPortal);
    await service.refresh();
    expect(portal.connected).toBe(true);
    expect(portal.store.company()?.name).toBe('North Care');
    expect(portal.tasks()).toEqual(service.tasks());
    expect(portal.newTask().owner).toBe('worker@example.test');
    expect(portal.newTask().due).toBe('2026-11-13');
    expect(portal.weekStart).toBe('2026-11-09');
  });

  it('preserves the editor client visit choices across background task refreshes', async () => {
    const normal = request.getMockImplementation()!;
    request.mockImplementation(async (path, body, method) => {
      const value = await normal(path, body, method);
      return path.includes('/options?') && path.includes('client_id=client-a')
        ? {
            ...value,
            visits: [
              { id: 'visit-a', date: '2026-11-13', start: '09:00', callName: 'Morning visit' },
            ],
          }
        : value;
    });
    await service.refresh();
    await service.loadOptions('client-a');
    expect(service.visits().map((visit) => visit.id)).toEqual(['visit-a']);
    await service.refresh();
    expect(service.visits().map((visit) => visit.id)).toEqual(['visit-a']);
    const lists = request.mock.calls.filter((call) => call[0].includes('/tasks?'));
    expect(lists.every((call) => !call[0].includes('client_id'))).toBe(true);
  });

  it('reports unavailable task options and recovers on retry instead of showing success', async () => {
    const normal = request.getMockImplementation()!;
    let unavailable = true;
    request.mockImplementation(async (path, body, method) => {
      if (path.includes('/options?') && unavailable)
        throw Error('Task choices are temporarily unavailable');
      return normal(path, body, method);
    });
    await service.refresh();
    expect(service.ready()).toBe(false);
    expect(service.error()).toBe('Task choices are temporarily unavailable');
    expect(service.capabilities().can_create).toBe(false);
    unavailable = false;
    await service.refresh();
    expect(service.ready()).toBe(true);
    expect(service.error()).toBe('');
    expect(service.capabilities().can_create).toBe(true);
  });
});
