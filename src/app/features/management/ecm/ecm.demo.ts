import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore, COURSES, Person } from '../shared/management.store';
import { emptyPayroll } from '../payroll/payroll.models';
import { RotaService } from '../rota/rota.service';
import { RotaVisit, RotaCall, RotaClient, londonDate } from '../rota/rota.models';
import { EcmService } from './ecm.service';
import { emptyEcm } from './ecm.models';

@Injectable({ providedIn: 'root' })
export class EcmDemo {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  readonly rota = inject(RotaService);
  private readonly service = inject(EcmService);
  readonly visits = computed(() =>
    this.rota.data().visits.filter((v) => v.demo && v.state === 'Published'),
  );
  readonly waiting = computed(() => this.service.data().feed.filter((e) => e.state === 'Waiting'));
  setup(): string | null {
    if (!this.rota.can('manage') || !this.rota.can('publish'))
      return 'Management and publishing permission are required to create the demo workflow.';
    if (this.visits().some((v) => v.date === londonDate()))
      return 'Today’s demo visits already exist. Use the staff preview or live-feed controls.';
    const now = Date.now();
    const time = (at: number) =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(at);
    const names = [
      'Mary Thompson',
      'Albert Williams',
      'Grace Okafor',
      'Eleanor Davies',
      'Robert Wilson',
      'Margaret Robinson',
    ];
    const offsets = [-20, -40, -10, -100, 30, -8];
    const calls = [
      'Morning call',
      'Lunch call',
      'Tea call',
      'Morning call',
      'Bed call',
      'Lunch call',
    ];
    const token = crypto.randomUUID().slice(0, 8);
    const people: Person[] = [];
    const clients: RotaClient[] = [];
    const packages: RotaCall[] = [];
    const visits: RotaVisit[] = [];
    for (let i = 0; i < names.length; i++) {
      const clientId = `demo-client-${i}`;
      const visitId = `demo-visit-${token}-${i}`;
      const staffId = `demo-carer-${i}`;
      const flags: RotaClient['riskFlags'] =
        i === 0
          ? ['Medication support', 'Living alone', 'Dementia', 'Critical / welfare-sensitive']
          : i === 1
            ? ['Critical / welfare-sensitive']
            : i === 2
              ? ['Medication support']
              : i === 5
                ? ['Living alone']
                : [];
      clients.push({
        id: clientId,
        name: `${names[i]} (demo)`,
        reference: `DEMO-10${i}`,
        address: `${i + 10} Sample Lane`,
        postcode: 'SW1A 1AA',
        funding: i % 2 ? 'Private' : 'Local authority',
        priority: i < 2 ? 'High' : 'Standard',
        active: true,
        riskFlags: flags,
        phone: '020 0000 0101',
        email: `client${i}@example.test`,
        representative: {
          name: `Representative ${i + 1}`,
          relationship: 'Family',
          phone: '020 0000 0202',
          email: `family${i}@example.test`,
        },
        billingRate: 25,
        billingBasis: 'Visit hour',
      });
      const makePerson = (id: string, name: string): Person => ({
        id,
        name,
        email: `${id}@example.test`,
        role: 'Care Worker',
        location: 'London',
        stage: 'Hired',
        vacancy: 'Demo care worker',
        start: '2020-01-01',
        notes: ['Dummy staff record for the ECM workflow.'],
        checks: Array(7).fill(true),
        onboarding: Array(8).fill(true),
        learning: COURSES.map((c) => c.id),
        progress: Object.fromEntries(COURSES.map((c) => [c.id, 100])),
        checkExpiry: {},
        visaExpiry: '',
      });
      people.push(makePerson(staffId, `Demo Carer ${String.fromCharCode(65 + i)}`));
      const staffIds = [staffId];
      if (i === 5) {
        staffIds.push('demo-carer-double');
        people.push(makePerson('demo-carer-double', 'Demo Carer G'));
      }
      const startAt = now + offsets[i] * 60000;
      const endAt = startAt + 45 * 60000;
      const date = londonDate(new Date(startAt));
      const callId = `demo-call-${i}`;
      packages.push({
        id: callId,
        clientId,
        name: calls[i],
        start: time(startAt),
        end: time(endAt),
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        carers: staffIds.length,
        skills: [],
        regularStaffIds: staffIds,
        tasks: 'Sample meal support, medication prompt and wellbeing check.',
        active: true,
      });
      const attendance =
        i === 2
          ? [{ personId: staffId, start: new Date(startAt + 60000).toISOString(), end: '' }]
          : i === 3
            ? [
                {
                  personId: staffId,
                  start: new Date(startAt).toISOString(),
                  end: new Date(endAt).toISOString(),
                },
              ]
            : i === 5
              ? [{ personId: staffId, start: new Date(startAt).toISOString(), end: '' }]
              : [];
      visits.push({
        id: visitId,
        callId,
        clientId,
        clientName: clients[i].name,
        address: `${clients[i].address}, ${clients[i].postcode}`,
        callName: calls[i],
        date,
        start: time(startAt),
        end: time(endAt),
        carers: staffIds.length,
        skills: [],
        tasks: packages[i].tasks,
        staffIds,
        allocation: i % 2 ? 'Temporary' : 'Regular',
        state: 'Published',
        priority: clients[i].priority,
        attendance,
        exception: '',
        riskFlags: flags,
        demo: true,
      });
    }
    return this.store.saveWorkspace((d) => {
      const rota = d.rota ?? { clients: [], calls: [], visits: [], audit: [], travelMinutes: 15 };
      const e = { ...emptyEcm(), ...rota.ecm };
      const payroll = d.payroll ?? emptyPayroll();
      const user = this.auth.currentUser()!;
      const freshIds = people.map((p) => p.id);
      const feed = [
        ...e.feed,
        {
          id: crypto.randomUUID(),
          visitId: visits[0].id,
          personId: visits[0].staffIds[0],
          kind: 'Check in' as const,
          state: 'Waiting' as const,
          at: '',
        },
        {
          id: crypto.randomUUID(),
          visitId: visits[5].id,
          personId: 'demo-carer-double',
          kind: 'Check in' as const,
          state: 'Waiting' as const,
          at: '',
        },
        {
          id: crypto.randomUUID(),
          visitId: visits[2].id,
          personId: visits[2].staffIds[0],
          kind: 'Check out' as const,
          state: 'Waiting' as const,
          at: '',
        },
        {
          id: crypto.randomUUID(),
          visitId: visits[0].id,
          personId: visits[0].staffIds[0],
          kind: 'Check out' as const,
          state: 'Waiting' as const,
          at: '',
        },
      ];
      return {
        ...d,
        people: [...d.people.filter((p) => !freshIds.includes(p.id)), ...people],
        payroll: {
          ...payroll,
          profiles: [
            ...payroll.profiles,
            ...people
              .filter((p) => !payroll.profiles.some((r) => r.personId === p.id))
              .map((p) => ({
                id: crypto.randomUUID(),
                personId: p.id,
                basis: 'Hourly' as const,
                rate: 13.5,
                weeklyHours: 37.5,
                effective: '2020-01-01',
                frequency: 'Monthly' as const,
              })),
          ],
        },
        rota: {
          ...rota,
          clients: [...rota.clients.filter((c) => !clients.some((n) => n.id === c.id)), ...clients],
          calls: [...rota.calls.filter((c) => !packages.some((n) => n.id === c.id)), ...packages],
          visits: [...rota.visits, ...visits],
          ecm: { ...e, feed },
          audit: [
            ...rota.audit,
            {
              id: crypto.randomUUID(),
              userId: user.id,
              user: user.name,
              at: new Date().toISOString(),
              action: 'ECM demo workflow created',
              detail: `${visits.length} published dummy visits, sample client files, trained carers and effective pay profiles`,
            },
          ],
        },
      };
    })
      ? null
      : 'Could not save demo data. Free some browser storage and try again.';
  }
  next(): string | null {
    if (!this.rota.can('attendance')) return 'Attendance permission is required.';
    const event = this.waiting()[0];
    if (!event) return 'No pending demo updates. Create today’s demo visits first.';
    const visit = this.rota.data().visits.find((v) => v.id === event.visitId);
    const existing = visit?.attendance.find((a) => a.personId === event.personId);
    const result = (event.kind === 'Check in' ? !!existing : !!existing?.end)
      ? null
      : this.service.attendance(
          event.visitId,
          event.personId,
          new Date().toISOString(),
          event.kind,
          'Simulated mobile event from the ECM demo feed.',
        );
    if (result) return result;
    return this.store.saveWorkspace((d) => {
      const r = d.rota!;
      const e = { ...emptyEcm(), ...r.ecm };
      return {
        ...d,
        rota: {
          ...r,
          ecm: {
            ...e,
            feed: e.feed.map((f) =>
              f.id === event.id ? { ...f, state: 'Applied', at: new Date().toISOString() } : f,
            ),
          },
        },
      };
    })
      ? null
      : 'Attendance saved, but the demo event could not be acknowledged. Refresh before retrying.';
  }
}
