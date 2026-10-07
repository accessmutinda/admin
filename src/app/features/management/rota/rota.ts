import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { A11yModule } from '@angular/cdk/a11y';
import { RouterLink } from '@angular/router';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore, COURSES } from '../shared/management.store';
import { RotaService } from './rota.service';
import { AccessRequired } from '../shared/access-required';
import { validVacancyDate } from '../recruitment/vacancy-deadline';
import {
  RotaCall,
  RotaClient,
  RotaVisit,
  addDays,
  completedVisit,
  londonDate,
  londonInstant,
  minutes,
} from './rota.models';

@Component({
  selector: 'cv-rota',
  imports: [
    DatePipe,
    FormsModule,
    MatSelectModule,
    CvSelect,
    A11yModule,
    RouterLink,
    AccessRequired,
  ],
  templateUrl: './rota.html',
})
export class Rota {
  protected readonly store = inject(ManagementStore);
  protected readonly service = inject(RotaService);
  private readonly toast = inject(ToastService);
  protected readonly today = londonDate();
  protected readonly tab = signal('Overview');
  protected readonly tabs = [
    'Overview',
    'Allocations',
    'Unallocated',
    'Published',
    'Planning',
    'Service users',
    'Audit',
    'Live board',
    'Staff view',
  ];
  protected readonly workflows = [
    {
      name: 'Start new allocation',
      icon: 'add_circle',
      tone: 'teal',
      view: 'new',
      description: 'Choose a service user, calls, dates and suitable carers.',
    },
    {
      name: 'Existing allocations',
      icon: 'calendar_month',
      tone: 'blue',
      view: 'Allocations',
      description: 'Review draft and published visits; arrange temporary cover.',
    },
    {
      name: 'Unallocated visits',
      icon: 'person_alert',
      tone: 'amber',
      view: 'Unallocated',
      description: 'Fill missing carer places before publishing your rota.',
    },
    {
      name: 'Published rota',
      icon: 'event_available',
      tone: 'green',
      view: 'Published',
      description: 'See confirmed assignments and expected care visits.',
    },
    {
      name: 'Monthly planning',
      icon: 'date_range',
      tone: 'purple',
      view: 'Planning',
      description: 'Plan a month, copy a week and check for conflicts.',
    },
    {
      name: 'Rota audit',
      icon: 'history',
      tone: 'blue',
      view: 'Audit',
      description: 'Trace planning, allocation, publishing and attendance changes.',
    },
  ];
  protected readonly courses = COURSES;
  protected readonly weekdays = [
    { id: 1, name: 'Mon' },
    { id: 2, name: 'Tue' },
    { id: 3, name: 'Wed' },
    { id: 4, name: 'Thu' },
    { id: 5, name: 'Fri' },
    { id: 6, name: 'Sat' },
    { id: 0, name: 'Sun' },
  ];
  protected readonly query = signal('');
  protected readonly from = signal(this.today);
  protected readonly to = signal(addDays(this.today, 30));
  protected readonly clientFilter = signal('');
  protected readonly staffFilter = signal('');
  protected readonly stateFilter = signal('All');
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly selected = signal<string | null>(null);
  protected readonly packageClient = signal('');
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly step = signal(1);
  protected readonly clock = signal(Date.now());
  protected month = this.today.slice(0, 7);
  protected travel = this.service.data().travelMinutes;
  protected copy = { source: addDays(this.today, -7), target: this.today };
  protected allocation = {
    clientId: '',
    callIds: [] as string[],
    from: this.today,
    to: addDays(this.today, 6),
    staffIds: [] as string[],
    useRegular: false,
    type: 'Regular' as RotaVisit['allocation'],
  };
  protected client: RotaClient = this.blankClient();
  protected call: RotaCall = this.blankCall();
  protected cover = {
    staffIds: [] as string[],
    type: 'Temporary' as RotaVisit['allocation'],
    reason: '',
  };
  protected attendance = { personId: '', start: '', end: '', note: '' };
  protected reason = '';
  protected readonly unallocated = computed(() =>
    this.service
      .data()
      .visits.filter((v) => v.state !== 'Cancelled' && v.staffIds.length < v.carers),
  );
  protected readonly drafts = computed(() =>
    this.service.data().visits.filter((v) => v.state === 'Draft'),
  );
  protected readonly published = computed(() =>
    this.service.data().visits.filter((v) => v.state === 'Published' && v.date >= this.today),
  );
  protected readonly regularCarers = computed(
    () =>
      new Set(
        this.service
          .data()
          .calls.filter((c) => c.active)
          .flatMap((c) => c.regularStaffIds),
      ).size,
  );
  protected readonly visit = computed(() =>
    this.service.data().visits.find((v) => v.id === this.selected()),
  );
  protected readonly filtered = computed(() =>
    this.service
      .data()
      .visits.filter(
        (v) =>
          (!this.from() || v.date >= this.from()) &&
          (!this.to() || v.date <= this.to()) &&
          (!this.clientFilter() || v.clientId === this.clientFilter()) &&
          (!this.staffFilter() || v.staffIds.includes(this.staffFilter())) &&
          (this.stateFilter() === 'All' || v.state === this.stateFilter()) &&
          (this.tab() !== 'Unallocated' ||
            (v.state !== 'Cancelled' && v.staffIds.length < v.carers)) &&
          (!['Published', 'Live board', 'Staff view'].includes(this.tab()) ||
            v.state === 'Published') &&
          `${v.clientName} ${v.callName} ${v.address} ${v.staffIds.map((id) => this.personName(id)).join(' ')}`
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      )
      .sort((a, b) =>
        `${a.date} ${a.start} ${a.clientName}`.localeCompare(
          `${b.date} ${b.start} ${b.clientName}`,
        ),
      ),
  );
  protected readonly clients = computed(() =>
    this.service
      .data()
      .clients.filter((c) =>
        `${c.name} ${c.reference} ${c.postcode}`.toLowerCase().includes(this.query().toLowerCase()),
      ),
  );
  protected readonly audit = computed(() =>
    [...this.service.data().audit]
      .reverse()
      .filter((a) =>
        `${a.action} ${a.detail} ${a.user}`.toLowerCase().includes(this.query().toLowerCase()),
      ),
  );
  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private blankClient(): RotaClient {
    return {
      id: crypto.randomUUID(),
      name: '',
      reference: '',
      address: '',
      postcode: '',
      funding: 'Local authority',
      priority: 'Standard',
      active: true,
    };
  }
  private blankCall(): RotaCall {
    return {
      id: crypto.randomUUID(),
      clientId: this.packageClient(),
      name: 'Morning call',
      start: '08:00',
      end: '08:45',
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      carers: 1,
      skills: [],
      regularStaffIds: [],
      tasks: '',
      active: true,
    };
  }
  protected choose(view: string): void {
    if (view === 'new') {
      this.open('allocation');
      return;
    }
    this.tab.set(view);
    this.query.set('');
    this.selected.set(null);
    this.selectedIds.set([]);
    this.stateFilter.set('All');
    this.error.set('');
    this.clientFilter.set('');
    this.staffFilter.set('');
    this.from.set(this.today);
    this.to.set(['Live board', 'Staff view'].includes(view) ? this.today : addDays(this.today, 30));
    if (view === 'Planning') this.setMonth(this.month);
  }
  protected personName(id: string): string {
    return this.store.data().people.find((p) => p.id === id)?.name ?? 'Staff record unavailable';
  }
  protected clientName(id: string): string {
    return this.service.data().clients.find((c) => c.id === id)?.name ?? 'Service user';
  }
  protected clientCalls(id: string): RotaCall[] {
    return this.service.data().calls.filter((c) => c.clientId === id);
  }
  protected allocationCalls(): RotaCall[] {
    return this.clientCalls(this.allocation.clientId).filter((c) => c.active);
  }
  protected allocationPreview(): { count: number; unallocated: number; issues: string[] } {
    const a = this.allocation;
    const client = this.service.data().clients.find((c) => c.id === a.clientId);
    const visits: RotaVisit[] = [];
    if (
      !client ||
      !validVacancyDate(a.from) ||
      !validVacancyDate(a.to) ||
      a.to < a.from ||
      a.to > addDays(a.from, 30)
    )
      return { count: 0, unallocated: 0, issues: [] };
    for (let date = a.from; date <= a.to; date = addDays(date, 1)) {
      for (const call of this.allocationCalls().filter(
        (c) =>
          a.callIds.includes(c.id) &&
          c.weekdays.includes(new Date(date + 'T12:00:00Z').getUTCDay()),
      )) {
        if (
          this.service
            .data()
            .visits.some((v) => v.callId === call.id && v.date === date && v.state !== 'Cancelled')
        )
          continue;
        visits.push({
          id: `preview-${call.id}-${date}`,
          callId: call.id,
          clientId: client.id,
          clientName: client.name,
          address: client.address,
          callName: call.name,
          date,
          start: call.start,
          end: call.end,
          carers: call.carers,
          skills: call.skills,
          tasks: call.tasks,
          staffIds: a.type === 'Regular' && a.useRegular ? call.regularStaffIds : a.staffIds,
          allocation: a.type,
          state: 'Draft',
          priority: client.priority,
          attendance: [],
          exception: '',
        });
      }
    }
    const all = [...this.service.data().visits, ...visits];
    return {
      count: visits.length,
      unallocated: visits.filter((v) => v.staffIds.length < v.carers).length,
      issues: [...new Set(visits.flatMap((v) => this.service.conflicts(v, all)))].slice(0, 8),
    };
  }
  protected skillName(id: string): string {
    return COURSES.find((c) => c.id === id)?.title ?? id;
  }
  protected days(call: RotaCall): string {
    return this.weekdays
      .filter((d) => call.weekdays.includes(d.id))
      .map((d) => d.name)
      .join(', ');
  }
  protected duration(v: Pick<RotaVisit, 'start' | 'end'>): number {
    return (minutes(v.end) - minutes(v.start) + 1440) % 1440;
  }
  protected status(v: RotaVisit): string {
    if (v.state === 'Cancelled') return 'Cancelled';
    if (v.staffIds.length < v.carers) return 'Unallocated';
    if (v.state === 'Draft') return 'Draft';
    if (completedVisit(v)) return 'Completed';
    if (v.attendance.length) return 'Part complete';
    const end = londonInstant(v.end > v.start ? v.date : addDays(v.date, 1), v.end);
    return end && Date.parse(end) < this.clock() ? 'Attendance overdue' : 'Expected';
  }
  protected completed(v: RotaVisit): boolean {
    return completedVisit(v);
  }
  protected overnight(v: Pick<RotaVisit, 'start' | 'end'>): boolean {
    return v.end <= v.start;
  }
  protected ukStamp(at: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(at));
  }
  protected open(kind: string, id = ''): void {
    if (!this.service.can(kind === 'attendance' ? 'attendance' : 'manage')) return;
    this.error.set('');
    this.modal.set(kind);
    this.step.set(1);
    if (kind === 'client')
      this.client = id
        ? structuredClone(this.service.data().clients.find((c) => c.id === id)!)
        : this.blankClient();
    if (kind === 'call')
      this.call = id
        ? structuredClone(this.service.data().calls.find((c) => c.id === id)!)
        : this.blankCall();
    if (kind === 'allocation') {
      this.allocation = {
        clientId: this.packageClient(),
        callIds: [],
        from: this.from(),
        to: this.to(),
        staffIds: [],
        useRegular: false,
        type: 'Regular',
      };
      if (this.allocation.to > addDays(this.allocation.from, 30))
        this.allocation.to = addDays(this.allocation.from, 30);
    }
    if (kind === 'cover')
      this.cover = { staffIds: [...(this.visit()?.staffIds ?? [])], type: 'Temporary', reason: '' };
    if (kind === 'cancel') this.reason = '';
    if (kind === 'attendance') {
      const v = this.visit()!;
      this.attendance = {
        personId: v.staffIds.find((id) => !v.attendance.some((a) => a.personId === id)) ?? '',
        start: `${v.date}T${v.start}`,
        end: `${this.overnight(v) ? addDays(v.date, 1) : v.date}T${v.end}`,
        note: '',
      };
    }
  }
  protected close(): void {
    this.modal.set('');
    this.error.set('');
  }
  protected toggleDay(id: number): void {
    this.call.weekdays = this.call.weekdays.includes(id)
      ? this.call.weekdays.filter((d) => d !== id)
      : [...this.call.weekdays, id];
  }
  protected changeAllocationClient(): void {
    this.allocation.callIds = [];
    this.allocation.staffIds = [];
  }
  protected next(): void {
    if (this.step() === 1 && (!this.allocation.clientId || !this.allocation.callIds.length)) {
      this.error.set('Choose a service user and at least one call.');
      return;
    }
    if (
      this.step() === 2 &&
      (!validVacancyDate(this.allocation.from) ||
        !validVacancyDate(this.allocation.to) ||
        this.allocation.to < this.allocation.from ||
        this.allocation.to > addDays(this.allocation.from, 30))
    ) {
      this.error.set('Choose a date range of up to 31 days.');
      return;
    }
    this.error.set('');
    this.step.update((s) => Math.min(s + 1, 3));
  }
  protected save(): void {
    let result: string | null = 'Choose a valid action.';
    const kind = this.modal();
    if (kind === 'client') result = this.service.saveClient(this.client);
    if (kind === 'call') result = this.service.saveCall(this.call);
    if (kind === 'allocation')
      result = this.service.generate(
        this.allocation.clientId,
        this.allocation.callIds,
        this.allocation.from,
        this.allocation.to,
        this.allocation.type === 'Regular' && this.allocation.useRegular
          ? null
          : this.allocation.staffIds,
        this.allocation.type,
      );
    if (kind === 'cover')
      result = this.service.allocate(
        this.selected()!,
        this.cover.staffIds,
        this.cover.type,
        this.cover.reason,
      );
    if (kind === 'copy') result = this.service.copyWeek(this.copy.source, this.copy.target);
    if (kind === 'cancel') result = this.service.cancel(this.selected()!, this.reason);
    if (kind === 'attendance') {
      const start = this.attendance.start.split('T'),
        end = this.attendance.end.split('T');
      const a = londonInstant(start[0], start[1] ?? ''),
        b = londonInstant(end[0], end[1] ?? '');
      result =
        a && b
          ? this.service.recordAttendance(
              this.selected()!,
              this.attendance.personId,
              a,
              b,
              this.attendance.note,
            )
          : 'Enter valid UK times. Ambiguous or missing times during a clock change need a different time.';
    }
    if (result) {
      this.error.set(result);
      return;
    }
    if (kind === 'client') {
      this.packageClient.set(this.client.id);
      this.tab.set('Service users');
    }
    if (kind === 'call') this.packageClient.set(this.call.clientId);
    if (kind === 'allocation') {
      this.choose('Allocations');
      this.from.set(this.allocation.from);
      this.to.set(this.allocation.to);
      this.clientFilter.set(this.allocation.clientId);
    }
    this.close();
    this.toast.success(
      kind === 'allocation'
        ? 'Draft visits created. Review and publish when ready.'
        : 'Rota changes saved.',
    );
  }
  protected view(v: RotaVisit): void {
    this.selected.set(v.id);
    this.error.set('');
    setTimeout(() => document.getElementById('rota-visit-title')?.focus(), 0);
  }
  protected toggleVisit(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
    );
  }
  protected toggleAll(): void {
    const ids = this.filtered()
      .filter((v) => v.state === 'Draft')
      .map((v) => v.id);
    this.selectedIds.set(ids.every((id) => this.selectedIds().includes(id)) ? [] : ids);
  }
  protected allSelected(): boolean {
    const ids = this.filtered()
      .filter((v) => v.state === 'Draft')
      .map((v) => v.id);
    return !!ids.length && ids.every((id) => this.selectedIds().includes(id));
  }
  protected publish(): void {
    const result = this.service.publish(this.selectedIds());
    this.error.set(result ?? '');
    if (!result) {
      this.selectedIds.set([]);
      this.toast.success('Rota published. Expected visits are available on this device.');
    }
  }
  protected saveTravel(): void {
    const result = this.service.saveTravel(this.travel);
    this.error.set(result ?? '');
    if (!result) this.toast.success('Planning rules saved.');
  }
  protected transfer(): void {
    const result = this.service.sendToPayroll(this.from());
    this.error.set(result ?? '');
    if (!result) this.toast.success('Completed visits sent to Payroll → Timesheets for approval.');
  }
  protected setMonth(value: string): void {
    this.month = value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    this.from.set(value + '-01');
    const next = new Date(Date.parse(value + '-01T12:00:00Z'));
    next.setUTCMonth(next.getUTCMonth() + 1);
    this.to.set(addDays(next.toISOString().slice(0, 10), -1));
  }
  protected monthDays(): string[] {
    const result = [];
    for (let date = this.from(); date <= this.to() && result.length < 31; date = addDays(date, 1))
      result.push(date);
    return result;
  }
  protected dayVisits(date: string): RotaVisit[] {
    return this.filtered().filter((v) => v.date === date && v.state !== 'Cancelled');
  }
  protected dayUnallocated(date: string): number {
    return this.dayVisits(date).filter((v) => v.staffIds.length < v.carers).length;
  }
  protected calendarOffset(): number {
    return (new Date(this.from() + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }
  protected showDay(date: string): void {
    this.choose('Allocations');
    this.from.set(date);
    this.to.set(date);
  }
  protected export(): void {
    if (!this.service.can('export')) return;
    const escape = (value: string) =>
      '"' + (/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const rows = [
      [
        'Service user',
        'Call',
        'Date (UK)',
        'Start (UK)',
        'End (UK)',
        'Carers',
        'Allocation',
        'State',
      ],
      ...this.filtered().map((v) => [
        v.clientName,
        v.callName,
        v.date,
        v.start,
        v.end + (this.overnight(v) ? ' (+1 day)' : ''),
        v.staffIds.map((id) => this.personName(id)).join('; '),
        v.allocation,
        this.status(v),
      ]),
    ];
    this.store.download(
      'rota.csv',
      rows.map((r) => r.map(escape).join(',')).join('\r\n'),
      'text/csv',
    );
  }
}
