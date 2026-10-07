import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { EcmService } from './ecm.service';
import { EcmOperations } from './ecm.operations';
import { EcmDemo } from './ecm.demo';
import { londonDate, londonInstant } from '../rota/rota.models';

describe('ECM frontend workflows', () => {
  let store: ManagementStore;
  let ops: EcmOperations;
  let demo: EcmDemo;
  let service: EcmService;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    ops = TestBed.inject(EcmOperations);
    demo = TestBed.inject(EcmDemo);
    service = TestBed.inject(EcmService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('allows Finance Officers to prepare, approve and export client billing without rota edit access', () => {
    demo.setup();
    while (demo.waiting().length) {
      vi.advanceTimersByTime(1000);
      expect(demo.next()).toBeNull();
    }
    actor.set({ ...actor(), roleCode: 'FN' });
    expect(ops.rota.can('manage')).toBe(false);
    expect(ops.createInvoices(londonDate())).toBeNull();
    const invoice = ops.data().invoices[0];
    expect(ops.invoiceState(invoice.id, 'Exported')).toContain('Approve');
    expect(ops.invoiceState(invoice.id, 'Approved')).toBeNull();
    expect(ops.invoiceState(invoice.id, 'Exported')).toBeNull();
    expect(ops.data().invoices[0].audit.at(-1)?.note).toBe('Exported');
    expect(ops.createInvoices(londonDate())).toContain('No new');
    actor.set({ ...actor(), roleCode: 'CW' });
    expect(ops.createInvoices(londonDate())).toContain('access');
    expect(ops.invoiceState(invoice.id, 'Approved')).toContain('cannot');
  });
  it('creates connected scenarios without replacing existing data, and prevents duplicate setup', () => {
    const people = store.data().people.length;
    expect(demo.setup()).toBeNull();
    expect(demo.visits()).toHaveLength(6);
    expect(store.data().people.length).toBe(people + 7);
    expect(ops.rota.data().clients[0].riskFlags).toHaveLength(4);
    expect(store.data().payroll?.profiles.some((p) => p.personId === 'demo-carer-0')).toBe(true);
    expect(demo.setup()).toContain('already');
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(demo.visits()).toHaveLength(0);
  });
  it('applies mobile feed events including double-up attendance and safely retries failed acknowledgements', () => {
    expect(demo.setup()).toBeNull();
    const first = demo.waiting()[0];
    const real = store.saveWorkspace.bind(store);
    let count = 0;
    const spy = vi
      .spyOn(store, 'saveWorkspace')
      .mockImplementation((fn) => (++count === 2 ? false : real(fn)));
    expect(demo.next()).toContain('acknowledged');
    expect(ops.rota.data().visits.find((v) => v.id === first.visitId)?.attendance).toHaveLength(1);
    spy.mockRestore();
    expect(demo.next()).toBeNull();
    expect(ops.rota.data().visits.find((v) => v.id === first.visitId)?.attendance).toHaveLength(1);
    expect(demo.next()).toBeNull();
    expect(ops.rota.data().visits.find((v) => v.carers === 2)?.attendance).toHaveLength(2);
    expect(demo.next()).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(demo.next()).toBeNull();
    expect(demo.waiting()).toHaveLength(0);
    expect(ops.kpis(londonDate()).completed).toBe(3);
  });
  it('reschedules agreed unstarted calls and preserves duration, rejecting conflicts and started visits', () => {
    demo.setup();
    const upcoming = demo.visits()[4];
    expect(ops.reschedule(upcoming.id, upcoming.date, '15:00', 'Agreed change', false)).toContain(
      'confirmation',
    );
    expect(ops.reschedule(upcoming.id, upcoming.date, '15:00', 'Agreed change', true)).toBeNull();
    expect(ops.rota.data().visits.find((v) => v.id === upcoming.id)?.end).toBe('15:45');
    expect(ops.reschedule(demo.visits()[2].id, upcoming.date, '15:00', 'Changed', true)).toContain(
      'unstarted',
    );
    store.update((d) => ({
      ...d,
      leaves: [
        ...d.leaves,
        {
          id: 'testleave',
          person: store.data().people.find((p) => p.id === upcoming.staffIds[0])!.name,
          type: 'Annual',
          start: upcoming.date,
          end: upcoming.date,
        } as (typeof d.leaves)[number],
      ],
    }));
    expect(ops.reschedule(upcoming.id, upcoming.date, '16:00', 'Agreed', true)).toContain('leave');
  });
  it('applies accepted changed-time follow-up atomically with queued notification', () => {
    demo.setup();
    const v = demo.visits()[4];
    expect(
      service.record(v.id, {
        action: 'Request changed time',
        note: 'Agreed with family',
        contact: '',
        outcome: 'Agreed',
        eta: '16:00',
        accepted: true,
        concern: false,
        followUp: 'Monitor',
        queueMessage: true,
        channel: 'SMS',
        recipient: '020 0000 0202',
      }),
    ).toBeNull();
    expect(ops.rota.data().visits.find((r) => r.id === v.id)?.start).toBe('16:00');
    expect(service.data().notifications).toHaveLength(1);
  });
  it('moves an agreed overnight arrival past midnight onto the following date', () => {
    demo.setup();
    const v = demo.visits()[4];
    store.update((d) => ({
      ...d,
      rota: {
        ...d.rota!,
        visits: d.rota!.visits.map((r) =>
          r.id === v.id ? { ...r, start: '23:30', end: '00:15' } : r,
        ),
      },
    }));
    expect(
      service.record(v.id, {
        action: 'Request changed time',
        note: 'Agreed overnight change',
        contact: '',
        outcome: '',
        eta: '00:15',
        accepted: true,
        concern: false,
        followUp: '',
      }),
    ).toBeNull();
    const changed = ops.rota.data().visits.find((r) => r.id === v.id)!;
    expect(changed.date).toBe('2026-10-08');
    expect(changed.start).toBe('00:15');
    expect(changed.end).toBe('01:00');
  });
  it('allows manager overrides with explicit reasons and audits soft conflicts but enforces required carers', () => {
    demo.setup();
    const v = demo.visits()[4];
    store.update((d) => ({
      ...d,
      people: d.people.map((p) =>
        p.id === v.staffIds[0] ? { ...p, learning: [], progress: {} } : p,
      ),
      rota: {
        ...d.rota!,
        visits: d.rota!.visits.map((r) => (r.id === v.id ? { ...r, skills: ['medication'] } : r)),
      },
    }));
    expect(ops.override(v.id, [], 'Cover', true)).toContain('required');
    expect(ops.override(v.id, v.staffIds, 'Emergency cover', false)).toContain('acknowledge');
    expect(ops.override(v.id, v.staffIds, 'Emergency cover', true)).toBeNull();
    expect(
      ops.rota
        .data()
        .visits.find((r) => r.id === v.id)
        ?.manualOverride?.conflicts.join(),
    ).toContain('medication');
    actor.set({ ...actor(), roleCode: 'CC' });
    expect(ops.override(v.id, v.staffIds, 'Cover', true)).toContain('manager');
  });
  it('queues demo messages, handles failure/retry/delivery, assigns and resolves an escalation', () => {
    demo.setup();
    const v = demo.visits()[0];
    const owner = store.data().members.find((m) => m.status === 'Active')!.id;
    expect(
      service.record(v.id, {
        action: 'Escalate missed visit risk',
        note: 'Welfare check required',
        contact: '',
        outcome: '',
        eta: '',
        accepted: false,
        concern: true,
        followUp: 'Call family',
        ownerId: owner,
        queueMessage: true,
        channel: 'Email',
        recipient: 'family@example.test',
      }),
    ).toBeNull();
    const n = ops.data().notifications[0];
    expect(ops.delivery(n.id, 'Failed')).toBeNull();
    expect(ops.delivery(n.id, 'Queued')).toBeNull();
    expect(ops.delivery(n.id, 'Delivered')).toBeNull();
    expect(ops.delivery(n.id, 'Failed')).toContain('already');
    expect(ops.data().notifications[0].attempts).toBe(2);
    const c = ops.data().escalations[0];
    expect(ops.escalation(c.id, 'missing', 'Resolved', 'Checked')).toContain('active');
    expect(ops.escalation(c.id, owner, 'Resolved', 'Welfare check confirmed')).toBeNull();
    expect(ops.data().escalations[0].history).toHaveLength(2);
  });
  it('prepares idempotent actual-duration client billing snapshots and audited export transitions', () => {
    demo.setup();
    expect(ops.createInvoices(londonDate())).toBeNull();
    const i = ops.data().invoices[0];
    expect(i.lines[0].hours).toBe(0.75);
    expect(i.lines[0].amount).toBe(18.75);
    expect(ops.createInvoices(londonDate())).toContain('No new');
    store.update((d) => ({
      ...d,
      rota: { ...d.rota!, clients: d.rota!.clients.map((c) => ({ ...c, billingRate: 99 })) },
    }));
    expect(ops.data().invoices[0].lines[0].rate).toBe(25);
    expect(ops.invoiceState(i.id, 'Exported')).toContain('Approve');
    expect(ops.invoiceState(i.id, 'Approved')).toBeNull();
    expect(ops.invoiceState(i.id, 'Exported')).toBeNull();
    expect(ops.invoiceState(i.id, 'Approved')).toContain('locked');
  });
  it('routes sensitive evidence for review and excludes media bytes from CQC pack snapshots', () => {
    demo.setup();
    const v = demo.visits()[0];
    expect(
      service.evidence(
        v.id,
        {
          type: 'Safeguarding',
          note: 'Sample concern',
          photo: 'data:image/png;base64,YQ==',
          photoName: 'sample.png',
          audio: 'data:audio/webm;base64,YQ==',
          audioName: 'sample.webm',
        },
        true,
      ),
    ).toBeNull();
    expect(ops.data().escalations).toHaveLength(1);
    expect(service.viewAudio(service.data().evidence[0].id)).toBeNull();
    expect(ops.createPack(londonDate())).toBeNull();
    const snapshot = JSON.parse(ops.data().packs[0].snapshot);
    expect(snapshot.evidence[0].photoAttached).toBe(true);
    expect(snapshot.evidence[0].audioAttached).toBe(true);
    expect(ops.data().packs[0].snapshot).not.toContain('base64');
  });
  it('leaves data unchanged on failed saves and denies view-only mutations', () => {
    demo.setup();
    const v = demo.visits()[4];
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(ops.reschedule(v.id, v.date, '15:00', 'Agreed', true)).toContain('Could not save');
    expect(ops.rota.data().visits.find((r) => r.id === v.id)?.start).toBe(v.start);
    actor.set({ ...actor(), roleCode: 'CW' });
    expect(ops.createPack(v.date)).toContain('permission');
    expect(demo.next()).toContain('permission');
  });
});
