import { CarePlanPackageHandoffs } from '../care/care-plan-package-handoffs';
import { ModuleDesign } from '../shared/module-design';
import { Component, DestroyRef, computed, effect, untracked, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { A11yModule } from '@angular/cdk/a11y';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { COURSES } from '../shared/management.store';
import { RosterApi } from './roster-api.service';
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
  RISK_FLAGS,
} from './rota.models';

@Component({
  selector: 'cv-rota',
  providers: [RosterApi],
  imports: [
    ModuleDesign,
    CarePlanPackageHandoffs,
    DatePipe,
    FormsModule,
    MatSelectModule,
    CvSelect,
    A11yModule,
    RouterLink,
    AccessRequired,
  ],
  host: { class: 'module-page operations-page rota-page' },
  styles: ['.page-heading, .page-heading > .row { flex-wrap: wrap; }'],
  templateUrl: './rota.html',
})
export class Rota {
  protected readonly service = inject(RosterApi);
  protected readonly store = this.service.store;
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly today = londonDate();
  private readonly route = inject(ActivatedRoute);
  protected readonly workspaceView = this.route.snapshot.data['visitsWorkspace'] === true;
  protected readonly section = this.route.snapshot.data['rotaSection'] as string | undefined;
  protected readonly sectionTitle =
    this.section === 'call-packages'
      ? 'Call packages'
      : this.section === 'history'
        ? 'History & audit'
        : 'Publishing';
  protected readonly handoffClientId = this.route.snapshot.queryParamMap.get('client') || '';
  protected readonly clientFiles = !!this.route.snapshot.data['clientFiles'];
  protected readonly riskFlags = RISK_FLAGS;
  private readonly callStyles = computed(() => {
    if (this.section === 'call-packages') {
      const defaults: Record<
        string,
        {
          duration?: number;
          priority?: 'Standard' | 'High';
          skills?: string[];
          active?: boolean;
        }
      > = { ...this.service.data().ecm?.styles };
      for (const call of this.service.data().calls)
        if (call.scheduleRecorded && call.active && !defaults[call.name])
          defaults[call.name] = {
            duration: (minutes(call.end) - minutes(call.start) + 1440) % 1440,
            priority: call.priority,
            skills: call.skills,
            active: call.active,
          };
      return defaults;
    }
    return this.service.data().ecm?.styles ?? {};
  });
  protected readonly callTypes = computed(() => Object.keys(this.callStyles()));
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
  protected get courses() {
    if (this.section === 'publishing')
      return (this.service.publishing()?.training_options ?? []).map((c) => ({
        id: c.id,
        title: c.name,
      }));
    if (!['call-packages', 'history'].includes(this.section || '')) return COURSES;
    const options = new Map(
      (
        (this.section === 'history' ? this.service.historyMeta() : this.service.packageMeta())
          ?.training_options ?? []
      ).map((c) => [c.id, { id: c.id, title: c.name }]),
    );
    for (const code of [...this.service.data().calls.flatMap((c) => c.skills), ...this.call.skills])
      if (!options.has(code)) options.set(code, { id: code, title: code });
    return [...options.values()];
  }
  private openGeneration = 0;
  private readonly selectedVersions = new Map<string, string>();
  private linkedReview = false;
  protected callWasActive = false;
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
  protected travel: number | null = null;
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
      .visits.filter(
        (v) =>
          v.state !== 'Cancelled' &&
          (v.requirementsRecorded === false || v.staffIds.length < v.carers),
      ),
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
  protected readonly sectionStats = computed(() => {
    const data = this.service.data();
    if (this.section === 'call-packages') {
      const metrics = this.service.packageMeta()?.metrics;
      return [
        {
          label: 'Active service users',
          value: metrics?.active_clients ?? '—',
          icon: 'groups',
          tone: 'blue',
          detail: 'Current care records',
        },
        {
          label: 'Active call packages',
          value: metrics?.active_packages ?? '—',
          icon: 'event_repeat',
          tone: 'teal',
          detail: 'Recurring care calls',
        },
        {
          label: 'Regular carers',
          value: metrics?.regular_carers ?? '—',
          icon: 'person_check',
          tone: 'green',
          detail: 'Assigned to active packages',
        },
        {
          label: 'High-priority packages',
          value: metrics?.priority_packages ?? '—',
          icon: 'priority_high',
          tone: 'orange',
          detail: 'Active priority calls',
        },
      ];
    }
    if (this.section === 'publishing') {
      const metrics = this.service.publishing()?.metrics;
      return [
        {
          label: 'Draft visits',
          value: metrics?.drafts ?? '—',
          icon: 'edit_calendar',
          tone: 'blue',
          detail: 'Today and future drafts in the selected period',
        },
        {
          label: 'Drafts needing carers',
          value: metrics?.unallocated ?? '—',
          icon: 'person_alert',
          tone: 'orange',
          detail: 'Missing required carer places',
        },
        {
          label: 'Drafts with conflicts',
          value: metrics?.conflicts ?? '—',
          icon: 'warning',
          tone: 'pink',
          detail: 'Review before publishing',
        },
        {
          label: 'Published visits',
          value: metrics?.published ?? '—',
          icon: 'event_available',
          tone: 'green',
          detail: 'Today and future allocations in the selected period',
        },
      ];
    }
    const metrics = this.service.historyMeta()?.metrics;
    return [
      {
        label: 'Visit history',
        value: metrics?.visits ?? '—',
        icon: 'history',
        tone: 'blue',
        detail: 'Recorded visits in the selected period',
      },
      {
        label: 'Completed visits',
        value: metrics?.completed ?? '—',
        icon: 'task_alt',
        tone: 'green',
        detail: 'Recorded attendance complete',
      },
      {
        label: 'Cancelled visits',
        value: metrics?.cancelled ?? '—',
        icon: 'event_busy',
        tone: 'orange',
        detail: 'Retained historical records',
      },
      {
        label: 'Audit events',
        value: metrics?.audit ?? '—',
        icon: 'manage_search',
        tone: 'purple',
        detail: 'Recorded rota changes',
      },
    ];
  });
  protected readonly visit = computed(() =>
    this.service.data().visits.find((v) => v.id === this.selected()),
  );
  protected readonly filtered = computed(() =>
    this.service
      .data()
      .visits.filter(
        (v) =>
          (this.section !== 'history' || v.date <= this.today) &&
          (!this.from() || v.date >= this.from()) &&
          (!this.to() || v.date <= this.to()) &&
          (!this.clientFilter() || v.clientId === this.clientFilter()) &&
          (!this.staffFilter() || v.staffIds.includes(this.staffFilter())) &&
          (this.stateFilter() === 'All' || v.state === this.stateFilter()) &&
          (this.tab() !== 'Unallocated' ||
            (v.state !== 'Cancelled' &&
              (v.requirementsRecorded === false || v.staffIds.length < v.carers))) &&
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
    (this.section === 'history'
      ? [...this.service.data().audit]
      : [...this.service.data().audit].reverse()
    ).filter((a) =>
      `${a.action} ${a.detail} ${a.user}`.toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
  constructor() {
    effect(() => {
      this.service.scope();
      const from =
          this.section === 'history' ? this.from() : this.from() || addDays(this.to(), -30),
        to = this.to() || addDays(from, 30);
      const client = this.section === 'call-packages' ? this.packageClient() : '';
      const history =
        this.section === 'history'
          ? {
              start: from,
              end: to,
              client: this.clientFilter(),
              staff: this.staffFilter(),
              search: this.query(),
              view: this.tab() === 'Audit' ? 'audit' : 'visits',
            }
          : undefined;
      untracked(() => {
        if (this.service.can('view')) {
          if (this.section === 'call-packages') {
            void this.service.loadPackages(client);
            if (client) void this.service.records.detail(client);
          } else void this.loadPeriod(from, to, history);
        }
      });
    });
    effect(() => {
      this.service.scope();
      this.service.readable();
      if (this.section === 'call-packages') this.packageClient();
      untracked(() => {
        this.openGeneration++;
        this.call = this.blankCall();
        this.travel = null;
        this.modal.set('');
        this.selectedIds.set([]);
        this.selectedVersions.clear();
        this.selected.set('');
      });
    });
    effect(() => {
      const loading = this.service.loading();
      const rows = this.filtered();
      const reviews = this.service.publishing()?.reviews;
      if (this.section !== 'publishing' || loading) return;
      untracked(() => {
        const valid = new Map(
          rows
            .filter(
              (v) =>
                v.state === 'Draft' &&
                reviews?.[v.id]?.ready === true &&
                reviews[v.id].etag === v.etag,
            )
            .map((v) => [v.id, v.etag]),
        );
        this.selectedIds.update((ids) =>
          ids.filter((id) => valid.has(id) && valid.get(id) === this.selectedVersions.get(id)),
        );
        for (const id of this.selectedVersions.keys())
          if (!this.selectedIds().includes(id)) this.selectedVersions.delete(id);
        if (this.selected() && !this.service.data().visits.some((v) => v.id === this.selected()))
          this.selected.set(null);
      });
    });
    if (this.clientFiles) this.tab.set('Service users');
    if (this.section) {
      this.tab.set(
        this.section === 'call-packages'
          ? 'Service users'
          : this.section === 'history'
            ? 'History'
            : 'Allocations',
      );
      if (this.section === 'history') {
        this.from.set('');
        this.to.set(this.today);
      }
      if (this.section === 'publishing') this.stateFilter.set('Draft');
    }
    const params = this.route.snapshot.queryParamMap;
    const staffId = params.get('staff');
    if (staffId) {
      this.staffFilter.set(staffId);
      this.tab.set(this.section === 'history' ? 'History' : 'Staff view');
    }
    if (validVacancyDate(params.get('from') ?? '')) this.from.set(params.get('from')!);
    if (validVacancyDate(params.get('to') ?? '') && params.get('to')! >= this.from())
      this.to.set(params.get('to')!);
    const clientId = params.get('client');
    if (clientId) {
      this.packageClient.set(clientId);
      if (!this.section || this.section === 'call-packages') this.tab.set('Service users');
      else this.clientFilter.set(clientId);
    }
    const review = this.service.data().visits.find((visit) => visit.id === params.get('visit'));
    if (this.section === 'publishing' && review?.state === 'Draft') {
      this.selected.set(review.id);
      this.clientFilter.set(review.clientId);
      this.from.set(review.date);
      this.to.set(review.date);
    }
    const timer = setInterval(() => this.clock.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private async loadPeriod(
    from: string,
    to: string,
    history?: Record<string, string>,
  ): Promise<void> {
    this.travel = null;
    if (
      history
        ? await this.service.loadHistory(history)
        : await this.service.load(from, to, '', false, undefined, this.section === 'publishing')
    ) {
      this.travel = this.service.raw()?.travelMinutes ?? null;
      const id = this.route.snapshot.queryParamMap.get('visit');
      if (['publishing', 'history'].includes(this.section || '') && id && !this.linkedReview) {
        const row = this.service.data().visits.find((v) => v.id === id);
        if (row) {
          this.linkedReview = true;
          this.selected.set(row.id);
          this.clientFilter.set(row.clientId);
        }
      }
    }
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
      riskFlags: [],
      phone: '',
      email: '',
      representative: { name: '', relationship: '', phone: '', email: '' },
      billingRate: 0,
      billingBasis: 'Visit hour',
    };
  }
  private blankCall(): RotaCall {
    return {
      id: crypto.randomUUID(),
      clientId: this.packageClient(),
      timeSensitive: false,
      toleranceMinutes: 30,
      flexible: false,
      location: 'Home',
      taskType: '',
      driverRequired: false,
      backupStaffId: '',
      name: 'Morning call',
      start: '08:00',
      end: '08:45',
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      carers: 1,
      skills: [],
      regularStaffIds: [],
      tasks: '',
      active: true,
      priority: 'Standard',
    };
  }
  protected clientRecord() {
    return this.service.data().clients.find((c) => c.id === this.packageClient());
  }
  protected callDefaults(): void {
    const defaults = this.callStyles()[this.call.name];
    if (!defaults) return;
    const end = (minutes(this.call.start) + (defaults.duration ?? 45)) % 1440;
    this.call.end = `${Math.floor(end / 60)
      .toString()
      .padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`;
    this.call.priority = defaults.priority ?? 'Standard';
    this.call.skills = [...(defaults.skills ?? [])];
    this.call.active = defaults.active !== false;
  }
  protected toggleRisk(flag: (typeof RISK_FLAGS)[number]): void {
    this.client.riskFlags = this.client.riskFlags?.includes(flag)
      ? this.client.riskFlags.filter((f) => f !== flag)
      : [...(this.client.riskFlags ?? []), flag];
  }
  protected choose(view: string): void {
    if (this.section === 'history' && ['History', 'Audit'].includes(view)) {
      this.tab.set(view);
      this.query.set('');
      this.selected.set(null);
      this.error.set('');
      return;
    }
    if (view === 'Live board') {
      void this.router.navigate(['/manage/ecm']);
      return;
    }
    if (view === 'new') {
      this.open('allocation');
      return;
    }
    this.tab.set(view);
    this.query.set('');
    this.selected.set(null);
    this.selectedIds.set([]);
    this.stateFilter.set(this.section === 'publishing' && view === 'Allocations' ? 'Draft' : 'All');
    this.error.set('');
    this.clientFilter.set('');
    this.staffFilter.set('');
    this.from.set(this.today);
    this.to.set(['Live board', 'Staff view'].includes(view) ? this.today : addDays(this.today, 30));
    if (this.section === 'history') {
      this.from.set('');
      this.to.set(this.today);
    }
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
          priority: call.priority === 'High' || client.priority === 'High' ? 'High' : 'Standard',
          riskFlags: [...(client.riskFlags ?? [])],
          attendance: [],
          exception: '',
        });
      }
    }
    const all = [...this.service.data().visits, ...visits];
    return {
      count: visits.length,
      unallocated: visits.filter(
        (v) => v.requirementsRecorded === false || v.staffIds.length < v.carers,
      ).length,
      issues: [...new Set(visits.flatMap((v) => this.service.conflicts(v, all)))].slice(0, 8),
    };
  }
  protected skillName(id: string): string {
    return this.courses.find((c) => c.id === id)?.title ?? id;
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
    if (v.requirementsRecorded === false || v.staffIds.length < v.carers) return 'Unallocated';
    if (v.state === 'Draft') return 'Draft';
    if (this.service.raw()?.attendance_available === false) return 'Attendance unavailable';
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
  protected canClient(action: string): boolean {
    return this.service.can('view') && this.service.access.can('care', 'records', action);
  }
  protected async open(kind: string, id = ''): Promise<void> {
    if (this.service.saving()) return;
    if (this.section && kind === 'allocation' && this.service.can('create')) {
      void this.router.navigate(['/manage/rota/planner'], {
        queryParams: { plan: 'true', client: this.packageClient() || null },
      });
      return;
    }
    if (this.section && kind === 'cover') {
      void this.router.navigate(['/manage/rota/planner'], {
        queryParams: { visit: id || this.selected() },
      });
      return;
    }
    if (
      !(kind === 'client'
        ? this.canClient(id ? 'edit' : 'create')
        : this.service.can(
            kind === 'attendance'
              ? 'attendance'
              : kind === 'cancel'
                ? 'archive'
                : (kind === 'call' || kind === 'client') && !id
                  ? 'create'
                  : kind === 'allocation' || kind === 'copy'
                    ? 'create'
                    : 'edit',
          ))
    )
      return;
    const scope = this.service.scope();
    const generation = ++this.openGeneration;
    const client = this.packageClient();
    let call: RotaCall | undefined;
    try {
      if (kind === 'client' && id) await this.service.records.detail(id);
      if (kind === 'call' && id) call = await this.service.detailCall(id);
      if (['cover', 'cancel', 'attendance'].includes(kind)) {
        const visit = await this.service.detailVisit(id || this.selected()!);
        this.selected.set(visit.id);
      }
      if (
        scope !== this.service.scope() ||
        generation !== this.openGeneration ||
        client !== this.packageClient()
      )
        return;
      if (call) {
        if (client && call.clientId !== client)
          throw Error('This call package belongs to another service user.');
        this.call = call;
      }
    } catch (e) {
      if (scope !== this.service.scope() || generation !== this.openGeneration) return;
      this.error.set(e instanceof Error ? e.message : 'This record is unavailable.');
      return;
    }
    this.error.set('');
    this.modal.set(kind);
    this.step.set(1);
    if (kind === 'client')
      this.client = id
        ? {
            ...this.blankClient(),
            ...structuredClone(this.service.records.selected()!),
            representative: {
              ...this.blankClient().representative!,
              ...this.service.data().clients.find((c) => c.id === id)!.representative,
            },
          }
        : this.blankClient();
    if (kind === 'call') {
      this.call = id ? this.call : this.blankCall();
      this.callWasActive = !!id && this.call.active;
    }
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
  canLeave(): boolean {
    if (this.service.saving()) return false;
    return !this.modal() || window.confirm('Discard the unsaved rota changes?');
  }
  protected close(): void {
    if (this.service.saving()) return;
    this.openGeneration++;
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
  protected async save(): Promise<void> {
    if (this.service.saving()) return;
    const scope = this.service.scope();
    let result: string | null = 'Choose a valid action.';
    const kind = this.modal();
    if (kind === 'client') result = await this.service.saveClient(this.client);
    if (kind === 'call') result = await this.service.saveCall(this.call);
    if (kind === 'allocation')
      result = await this.service.generate(
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
      result = await this.service.allocate(
        this.selected()!,
        this.cover.staffIds,
        this.cover.type,
        this.cover.reason,
      );
    if (kind === 'copy') result = await this.service.copyWeek(this.copy.source, this.copy.target);
    if (kind === 'cancel') result = await this.service.cancel(this.selected()!, this.reason);
    if (kind === 'attendance') {
      const start = this.attendance.start.split('T'),
        end = this.attendance.end.split('T');
      const a = londonInstant(start[0], start[1] ?? ''),
        b = londonInstant(end[0], end[1] ?? '');
      result =
        a && b
          ? await this.service.recordAttendance(
              this.selected()!,
              this.attendance.personId,
              a,
              b,
              this.attendance.note,
            )
          : 'Enter valid UK times. Ambiguous or missing times during a clock change need a different time.';
    }
    if (scope !== this.service.scope()) return;
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
  protected selectable(v: RotaVisit): boolean {
    return (
      this.section !== 'history' &&
      v.state === 'Draft' &&
      this.service.can('publish') &&
      !this.service.loading() &&
      !this.service.saving() &&
      (this.section !== 'publishing' ||
        (this.service.publishing()?.reviews[v.id]?.ready === true &&
          this.service.publishing()?.reviews[v.id]?.etag === v.etag))
    );
  }
  protected toggleVisit(id: string): void {
    const row = this.filtered().find((v) => v.id === id);
    if (!row || !this.selectable(row)) return;
    if (this.selectedIds().includes(id)) {
      this.selectedVersions.delete(id);
      this.selectedIds.update((ids) => ids.filter((value) => value !== id));
    } else {
      this.selectedVersions.set(id, row.etag!);
      this.selectedIds.update((ids) => [...ids, id]);
    }
  }
  protected toggleAll(): void {
    const rows = this.filtered().filter((v) => this.selectable(v));
    if (rows.every((v) => this.selectedIds().includes(v.id))) {
      this.selectedIds.set([]);
      this.selectedVersions.clear();
    } else {
      this.selectedIds.set(rows.map((v) => v.id));
      this.selectedVersions.clear();
      for (const row of rows) this.selectedVersions.set(row.id, row.etag!);
    }
  }
  protected allSelected(): boolean {
    const rows = this.filtered().filter((v) => this.selectable(v));
    return !!rows.length && rows.every((v) => this.selectedIds().includes(v.id));
  }
  protected async publish(): Promise<void> {
    if (
      !this.service.can('publish') ||
      this.service.loading() ||
      this.service.saving() ||
      !this.selectedIds().length
    )
      return;
    const visible = this.filtered().filter(
      (v) =>
        this.selectedIds().includes(v.id) &&
        this.selectable(v) &&
        v.etag === this.selectedVersions.get(v.id),
    );
    if (visible.length !== this.selectedIds().length) {
      this.error.set('The selected drafts changed. Review the selection before publishing.');
      return;
    }
    const scope = this.service.scope();
    const result = await this.service.publish(
      this.selectedIds(),
      Object.fromEntries(this.selectedVersions),
    );
    if (scope !== this.service.scope()) return;
    this.error.set(result ?? '');
    if (!result) {
      this.selectedIds.set([]);
      this.selectedVersions.clear();
      this.toast.success('Rota published. Confirmed visits are saved.');
    }
  }
  protected async saveTravel(): Promise<void> {
    if (
      !this.service.can('edit') ||
      this.service.saving() ||
      this.service.loading() ||
      this.service.raw()?.company_id !== this.service.records.companyId()
    )
      return;
    if (
      this.travel === null ||
      !Number.isInteger(this.travel) ||
      this.travel < 0 ||
      this.travel > 120
    ) {
      this.error.set('Enter a travel buffer between 0 and 120 minutes.');
      return;
    }
    const scope = this.service.scope();
    const result = await this.service.saveTravel(this.travel);
    if (scope !== this.service.scope()) return;
    this.travel = this.service.raw()?.travelMinutes ?? null;
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
    return this.dayVisits(date).filter(
      (v) => v.requirementsRecorded === false || v.staffIds.length < v.carers,
    ).length;
  }
  protected calendarOffset(): number {
    return (new Date(this.from() + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }
  protected showDay(date: string): void {
    this.choose('Allocations');
    this.from.set(date);
    this.to.set(date);
  }
  protected async export(): Promise<void> {
    if (!this.service.can('export') || !(await this.service.refresh(true))) return;
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
