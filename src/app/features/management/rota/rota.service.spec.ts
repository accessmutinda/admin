import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { AppUser } from '../../../core/auth/models/user';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { PayrollService } from '../payroll/payroll.service';
import { RotaService } from './rota.service';
import { RotaCall, RotaClient, londonInstant, completedVisit } from './rota.models';

const client = (id = 'client'): RotaClient => ({
  id,
  name: 'Mary Smith',
  reference: id,
  address: '12 Test Street',
  postcode: 'SW1A 1AA',
  funding: 'Local authority',
  priority: 'High',
  active: true,
});
const call = (id = 'call', clientId = 'client', start = '08:00', end = '08:45'): RotaCall => ({
  id,
  clientId,
  name: 'Morning call',
  start,
  end,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  carers: 1,
  skills: [],
  regularStaffIds: [],
  tasks: 'Breakfast and wellbeing check',
  active: true,
});

describe('Rota allocation and publishing', () => {
  let service: RotaService;
  let store: ManagementStore;
  let payroll: PayrollService;
  const actor = signal<AppUser>({
    ...DEMO_USER,
    id: 'rota-admin',
    roleCode: 'CA',
    name: 'Rota administrator',
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, id: 'rota-admin', roleCode: 'CA', name: 'Rota administrator' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    service = TestBed.inject(RotaService);
    payroll = TestBed.inject(PayrollService);
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => ({
        ...p,
        start: '2026-01-01',
        checkExpiry: {},
        visaExpiry: '',
        checks: Array(7).fill(true),
      })),
      leaves: [],
    }));
    expect(service.saveClient(client())).toBeNull();
    expect(service.saveCall(call())).toBeNull();
  });
  it('keeps rota records isolated by company and denies unauthorised roles', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(service.data().clients).toHaveLength(0);
    expect(service.data().visits).toHaveLength(0);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    expect(service.data().visits).toHaveLength(1);
    actor.set({ ...actor(), roleCode: 'CW' });
    expect(service.can('view')).toBe(false);
    expect(service.generate('client', ['call'], '2026-10-07', '2026-10-07')).toContain(
      'permission',
    );
    actor.set({ ...actor(), roleCode: 'CA' });
    store.update((d) => ({
      ...d,
      permissions: { 'Company Admin:Care delivery': [true, false, false, false, false] },
    }));
    expect(service.can('view')).toBe(true);
    expect(service.can('manage')).toBe(false);
    expect(service.publish([service.data().visits[0].id])).toContain('permission');
  });
  it('honours configured rota actions for any role alongside Care delivery permissions', () => {
    actor.set({ ...actor(), roleCode: 'CW' });
    store.update((d) => ({
      ...d,
      rotaPermissions: { 'Care Worker': ['view', 'attendance'] },
      permissions: { 'Care Worker:Care delivery': [true, false, true, false, false] },
    }));
    expect(service.can('view')).toBe(true);
    expect(service.can('attendance')).toBe(true);
    expect(service.can('manage')).toBe(false);
    expect(service.can('publish')).toBe(false);
    expect(service.can('export')).toBe(false);
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06')).toContain(
      'permission',
    );
    store.update((d) => ({ ...d, rotaPermissions: { 'Care Worker': ['attendance'] } }));
    expect(service.can('attendance')).toBe(false);
    store.update((d) => ({
      ...d,
      rotaPermissions: { 'Care Worker': ['view', 'attendance'] },
      permissions: { 'Care Worker:Care delivery': [false, true, true, false, true] },
    }));
    expect(service.can('view')).toBe(false);
    expect(service.can('attendance')).toBe(false);
  });
  it('separates attendance from allocation management and publishing permissions', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    const id = service.data().visits[0].id;
    expect(service.publish([id])).toBeNull();
    actor.set({ ...actor(), roleCode: 'CW' });
    store.update((d) => ({ ...d, rotaPermissions: { 'Care Worker': ['view', 'attendance'] } }));
    expect(service.allocate(id, ['maria'], 'Temporary', 'Change')).toContain('permission');
    expect(service.publish([id])).toContain('permission');
    expect(
      service.recordAttendance(id, 'james', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
    ).toBeNull();
  });
  it('generates matching weekdays once and retains published snapshots when calls change', () => {
    const c = { ...call(), weekdays: [2] };
    expect(service.saveCall(c)).toBeNull();
    expect(service.generate('client', ['call'], '2026-10-05', '2026-10-11', ['james'])).toBeNull();
    expect(service.data().visits).toHaveLength(1);
    expect(service.data().visits[0].date).toBe('2026-10-06');
    expect(service.generate('client', ['call'], '2026-10-05', '2026-10-11', ['james'])).toContain(
      'No new',
    );
    const visit = service.data().visits[0];
    expect(service.publish([visit.id])).toBeNull();
    expect(service.saveCall({ ...c, start: '09:00', end: '09:45' })).toBeNull();
    expect(service.data().visits[0].start).toBe('08:00');
  });
  it('rejects conflicts atomically across a date range and rechecks leave at publication', () => {
    store.update((d) => ({
      ...d,
      leaves: [
        {
          id: 'leave',
          person: 'James Carter',
          type: 'Annual leave',
          start: '2026-10-07',
          end: '2026-10-07',
        },
      ],
    }));
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-07', ['james'])).toContain(
      'leave',
    );
    expect(service.data().visits).toHaveLength(0);
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    store.update((d) => ({
      ...d,
      leaves: [
        {
          id: 'leave',
          person: 'James Carter',
          type: 'Annual leave',
          start: '2026-10-06',
          end: '2026-10-06',
        },
      ],
    }));
    expect(service.publish([service.data().visits[0].id])).toContain('leave');
    expect(service.data().visits[0].state).toBe('Draft');
  });
  it('blocks overlapping visits and applies travel only between different service users', () => {
    expect(service.saveClient({ ...client('client-b'), name: 'Ahmed Ali' })).toBeNull();
    expect(service.saveCall(call('call-b', 'client-b', '08:45', '09:15'))).toBeNull();
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    expect(
      service.generate('client-b', ['call-b'], '2026-10-06', '2026-10-06', ['james']),
    ).toContain('travel');
    expect(service.saveCall(call('call-c', 'client', '08:45', '09:15'))).toBeNull();
    expect(
      service.generate('client', ['call-c'], '2026-10-06', '2026-10-06', ['james']),
    ).toBeNull();
    expect(service.saveCall(call('call-d', 'client', '08:30', '09:15'))).toBeNull();
    expect(service.generate('client', ['call-d'], '2026-10-06', '2026-10-06', ['maria'])).toContain(
      'overlapping',
    );
  });
  it('requires employment eligibility and completed required training', () => {
    expect(service.saveCall({ ...call(), skills: ['handling'] })).toBeNull();
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toContain(
      'training',
    );
    expect(service.saveCall(call())).toBeNull();
    store.update((d) => ({
      ...d,
      people: d.people.map((p) =>
        p.id === 'james' ? { ...p, start: '2026-10-19', checkExpiry: { DBS: '2026-10-01' } } : p,
      ),
    }));
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toContain(
      'start date',
    );
    expect(service.generate('client', ['call'], '2026-10-20', '2026-10-20', ['james'])).toContain(
      'expired',
    );
  });
  it('requires distinct double-up carers before publication and isolates temporary cover', () => {
    expect(service.saveCall({ ...call(), carers: 2 })).toBeNull();
    expect(
      service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james', 'james']),
    ).toContain('distinct');
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', [])).toBeNull();
    const visit = service.data().visits[0];
    expect(service.publish([visit.id])).toContain('still needs');
    expect(service.allocate(visit.id, ['james', 'maria'], 'Temporary', 'Cover absence')).toBeNull();
    expect(service.data().calls[0].regularStaffIds).toEqual([]);
    expect(service.publish([visit.id])).toBeNull();
    expect(service.allocate(visit.id, ['james'], 'Temporary', 'Reduce carers')).toContain('retain');
  });
  it('copies visits as drafts without attendance, skips duplicates and validates target conflicts', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    expect(service.publish([service.data().visits[0].id])).toBeNull();
    expect(service.copyWeek('2026-10-05', '2026-10-12')).toBeNull();
    expect(service.data().visits[1].state).toBe('Draft');
    expect(service.data().visits[1].date).toBe('2026-10-13');
    expect(service.data().visits[1].attendance).toEqual([]);
    expect(service.copyWeek('2026-10-05', '2026-10-12')).toContain('already exist');
    expect(service.copyWeek('2026-10-05', '2026-10-06')).toContain('after');
  });
  it('handles overnight overlaps, UK winter/summer offsets and clock-change ambiguity', () => {
    expect(londonInstant('2026-01-15', '08:00')).toBe('2026-01-15T08:00:00.000Z');
    expect(londonInstant('2026-07-15', '08:00')).toBe('2026-07-15T07:00:00.000Z');
    expect(londonInstant('2026-03-29', '01:30')).toBeNull();
    expect(londonInstant('2026-10-25', '01:30')).toBeNull();
    expect(service.saveCall(call('night', 'client', '23:00', '01:00'))).toBeNull();
    expect(service.generate('client', ['night'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    expect(service.saveClient(client('other'))).toBeNull();
    expect(service.saveCall(call('early', 'other', '00:30', '01:30'))).toBeNull();
    expect(service.generate('other', ['early'], '2026-10-07', '2026-10-07', ['james'])).toContain(
      'overlaps',
    );
  });
  it('records actual attendance only for published visits and locks completed records', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    const id = service.data().visits[0].id;
    expect(
      service.recordAttendance(id, 'james', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
    ).toContain('published');
    expect(service.publish([id])).toBeNull();
    expect(
      service.recordAttendance(id, 'maria', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
    ).toContain('allocated');
    expect(
      service.recordAttendance(id, 'james', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
    ).toBeNull();
    expect(completedVisit(service.data().visits[0])).toBe(true);
    expect(service.cancel(id, 'Cancel completed')).toContain('attendance');
    expect(service.allocate(id, ['maria'], 'Temporary', 'Cover')).toContain('attendance');
    expect(
      service.recordAttendance(id, 'james', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Edit'),
    ).toContain('locked');
  });
  it('transfers only actual completed work for separate payroll approval without duplicate imports', () => {
    expect(
      payroll.saveProfile({
        id: 'pay',
        personId: 'james',
        basis: 'Hourly',
        rate: 12.5,
        weeklyHours: 37.5,
        effective: '2026-01-01',
        frequency: 'Monthly',
      }),
    ).toBeNull();
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-07', ['james'])).toBeNull();
    const id = service.data().visits[0].id;
    expect(service.publish(service.data().visits.map((v) => v.id))).toBeNull();
    expect(service.sendToPayroll('2026-10-06')).toContain('No completed');
    expect(
      service.recordAttendance(
        id,
        'james',
        '2026-10-06T07:00Z',
        '2026-10-06T07:40Z',
        'Verified actual',
      ),
    ).toBeNull();
    expect(service.sendToPayroll('2026-10-06')).toBeNull();
    expect(payroll.data().work).toHaveLength(1);
    expect(payroll.data().work[0].actualHours).toBe(0.67);
    expect(payroll.data().work[0].status).toBe('Confirmed');
    expect(payroll.data().work[0].rotaVisitIds).toEqual([id]);
    expect(service.sendToPayroll('2026-10-06')).toContain('already');
    expect(payroll.data().work).toHaveLength(1);
  });
  it('keeps all selected visits draft when one is unallocated', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    expect(service.generate('client', ['call'], '2026-10-07', '2026-10-07', [])).toBeNull();
    expect(service.publish(service.data().visits.map((v) => v.id))).toContain('still needs');
    expect(service.data().visits.every((v) => v.state === 'Draft')).toBe(true);
  });

  it('blocks an entire payroll transfer when a double-up carer lacks a pay profile', () => {
    expect(service.saveCall({ ...call(), carers: 2 })).toBeNull();
    expect(
      service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james', 'maria']),
    ).toBeNull();
    const id = service.data().visits[0].id;
    expect(service.publish([id])).toBeNull();
    for (const person of ['james', 'maria'])
      expect(
        service.recordAttendance(id, person, '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
      ).toBeNull();
    expect(
      payroll.saveProfile({
        id: 'pay',
        personId: 'james',
        basis: 'Hourly',
        rate: 12.5,
        weeklyHours: 37.5,
        effective: '2026-01-01',
        frequency: 'Monthly',
      }),
    ).toBeNull();
    expect(service.sendToPayroll('2026-10-06')).toContain('Every carer');
    expect(payroll.data().work).toEqual([]);
  });

  it('does not publish partially when browser persistence fails', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    const original = structuredClone(service.data());
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(service.publish([original.visits[0].id])).toContain('Could not save');
    expect(service.data()).toEqual(original);
  });

  it('retains rota and payroll records when an attendance transfer cannot be persisted', () => {
    expect(service.generate('client', ['call'], '2026-10-06', '2026-10-06', ['james'])).toBeNull();
    const id = service.data().visits[0].id;
    expect(service.publish([id])).toBeNull();
    expect(
      service.recordAttendance(id, 'james', '2026-10-06T07:00Z', '2026-10-06T07:45Z', 'Verified'),
    ).toBeNull();
    expect(
      payroll.saveProfile({
        id: 'pay',
        personId: 'james',
        basis: 'Hourly',
        rate: 12.5,
        weeklyHours: 37.5,
        effective: '2026-01-01',
        frequency: 'Monthly',
      }),
    ).toBeNull();
    const original = structuredClone(store.data());
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(service.sendToPayroll('2026-10-06')).toContain('Could not save');
    expect(store.data()).toEqual(original);
  });
});
