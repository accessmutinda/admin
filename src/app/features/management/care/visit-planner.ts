import { ProfileVisits } from './profile-visits';
import { ViewChild } from '@angular/core';
import { downloadWorkbook } from './workbook';
import { HostListener, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { ManagementStore, COURSES } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import {
  RotaVisit,
  addDays,
  londonDate,
  minutes,
  visitWindow,
  completedVisit,
} from '../rota/rota.models';
import { liveVisit, emptyEcm } from '../ecm/ecm.models';
import { csv, validDate, weekDates } from './care.models';
@Component({
  selector: 'cv-visit-planner',
  imports: [
    ModuleDesign,
    ProfileVisits,
    DatePipe,
    FormsModule,
    A11yModule,
    MatSelectModule,
    CvSelect,
  ],
  host: { class: 'module-page operations-page' },
  templateUrl: './visit-planner.html',
  styleUrls: [
    './care-shared.css',
    './care-controls.css',
    './visit-planner.css',
    './visit-allocation.css',
    './roster-reference.css',
    './roster-calendar.css',
  ],
})
export class VisitPlanner {
  @ViewChild(ProfileVisits) private profileVisits?: ProfileVisits;
  protected readonly now = signal(Date.now());
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.modal()) return;
      if (params.get('client')) {
        this.clientFilter.set(params.get('client')!);
        this.filterDraft.client = params.get('client')!;
      }
      if (params.get('staff')) {
        this.staffFilter.set(params.get('staff')!);
        this.filterDraft.staff = params.get('staff')!;
      }
      if (params.get('allocation') === 'Unallocated') {
        this.allocationFilter.set('Unallocated');
        this.filterDraft.unallocated = true;
        this.view.set('List');
      }
      if (validDate(params.get('from') ?? '')) this.anchor.set(params.get('from')!);
      if (params.get('plan') === 'true' && this.service.can('manage')) {
        this.create();
        this.plan.clientId = this.clientId() || params.get('client') || '';
      }
      if (params.get('visit')) {
        const visit = this.service.data().visits.find((v) => v.id === params.get('visit'));
        if (visit) {
          this.anchor.set(visit.date);
          this.edit(visit);
        }
      }
      if (params.get('plan') === 'true' || params.get('visit')) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { plan: null, visit: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }
  private readonly destroyRef = inject(DestroyRef);
  protected readonly service = inject(RotaService);
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly workspaceView = this.route.snapshot.data['visitsWorkspace'] === true;
  protected readonly clientId = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.service.data().clients.find((c) => c.id === this.clientId()),
  );
  protected readonly today = londonDate();
  protected readonly anchor = signal(this.today);
  protected readonly view = signal('Week');
  protected readonly query = signal('');
  protected readonly clientFilter = signal('');
  protected readonly staffFilter = signal('');
  protected readonly locationFilter = signal('');
  protected readonly skillFilter = signal('');
  protected readonly genderFilter = signal('');
  protected readonly driverFilter = signal('');
  protected readonly allocationFilter = signal('All');
  protected readonly showUnallocated = signal(true);
  protected readonly referenceCareTypes = [
    { name: 'Personal care', background: '#cce8fc', color: '#208ed1' },
    { name: 'Medication', background: '#d1f2df', color: '#21a876' },
    { name: 'Domestic', background: '#fff0c8', color: '#e4a724' },
    { name: 'Social', background: '#e7d8fa', color: '#8e68d1' },
    { name: 'Other', background: '#e6edf2', color: '#8c9daa' },
  ];
  protected readonly locations = computed(() =>
    [
      ...new Set(
        this.service
          .data()
          .clients.map((client) => client.address)
          .filter(Boolean),
      ),
    ].sort(),
  );
  protected careColour(visit: RotaVisit): string {
    return (
      this.referenceCareTypes.find((type) =>
        visit.callName.toLowerCase().includes(type.name.toLowerCase()),
      )?.color ?? '#208ed1'
    );
  }
  protected readonly moreFilters = signal(false);
  protected readonly trainingFilters = signal<Record<string, string>>({});
  protected readonly availabilityFilter = signal('');
  protected filterDraft = {
    staff: '',
    client: '',
    location: '',
    skill: '',
    gender: '',
    driver: '',
    medication: '',
    handling: '',
    dementia: '',
    challenging: '',
    availability: '',
    unallocated: false,
  };
  protected readonly specialistFilters = [
    { key: 'handling', label: 'Moving & Handling' },
    { key: 'dementia', label: 'Dementia Experience' },
    { key: 'challenging', label: 'Challenging Behaviour' },
  ] as const;
  protected applyFilters(): void {
    const filter = this.filterDraft;
    this.staffFilter.set(filter.staff);
    this.clientFilter.set(filter.client);
    this.locationFilter.set(filter.location);
    this.skillFilter.set(filter.skill);
    this.genderFilter.set(filter.gender);
    this.driverFilter.set(filter.driver);
    this.allocationFilter.set(filter.unallocated ? 'Unallocated' : 'All');
    if (filter.unallocated) this.showUnallocated.set(true);
    this.availabilityFilter.set(filter.availability);
    this.trainingFilters.set({
      medication: filter.medication,
      handling: filter.handling,
      dementia: filter.dementia,
      challenging: filter.challenging,
    });
    this.staffPage.set(1);
  }
  private trained(person: ReturnType<ManagementStore['staff']>[number], course: string): boolean {
    return person.hr
      ? person.hr.training.some(
          (training) =>
            training.courseId === course &&
            !!training.completed &&
            (!training.expiry || training.expiry >= this.end()),
        )
      : (person.progress[course] ?? 0) >= 100;
  }
  protected readonly periodVisits = computed(() =>
    this.service
      .data()
      .visits.filter(
        (v) => v.state !== 'Cancelled' && v.date >= this.start() && v.date <= this.end(),
      ),
  );
  protected readonly previousWeekVisits = computed(
    () =>
      this.service
        .data()
        .visits.filter(
          (v) =>
            v.state !== 'Cancelled' && v.date >= addDays(this.start(), -7) && v.date < this.start(),
        ).length,
  );
  protected percentage(value: number): number {
    return this.visits().length ? Math.round((value / this.visits().length) * 100) : 0;
  }
  protected weeklyChange(): string {
    const previous = this.previousWeekVisits();
    return previous
      ? Math.round(((this.periodVisits().length - previous) / previous) * 100) + '% vs last week'
      : 'No visits last week';
  }
  protected readonly staffOnLeave = computed(
    () =>
      new Set(
        this.store
          .data()
          .leaves.filter(
            (leave) =>
              leave.start <= this.end() &&
              leave.end >= this.start() &&
              (!leave.status || leave.status === 'Approved') &&
              /annual/i.test(leave.type),
          )
          .map((leave) => leave.personId ?? leave.person),
      ).size,
  );
  protected readonly courses = COURSES;
  protected readonly start = computed(() => {
    const date = this.anchor();
    return this.view() === 'Month'
      ? date.slice(0, 7) + '-01'
      : addDays(date, -((new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7));
  });
  protected readonly end = computed(() =>
    this.view() === 'Month' ? addDays(this.nextMonth(this.start()), -1) : addDays(this.start(), 6),
  );
  protected readonly days = computed(() => weekDates(this.start()));
  protected readonly monthDays = computed(() => {
    const start = addDays(
      this.start(),
      -((new Date(this.start() + 'T12:00:00Z').getUTCDay() + 6) % 7),
    );
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  });
  protected readonly staff = computed(() =>
    this.store
      .staff()
      .filter(
        (p) =>
          (!this.staffFilter() || p.id === this.staffFilter()) &&
          Object.entries(this.trainingFilters()).every(
            ([course, required]) => !required || this.trained(p, course) === (required === 'Yes'),
          ) &&
          (!this.availabilityFilter() ||
            this.days().some(
              (date) => !this.store.data().leaves.some(this.leaveFor(p.id, date)),
            )) &&
          (!this.genderFilter() || p.hr?.personal.gender === this.genderFilter()) &&
          (!this.driverFilter() || !!p.hr?.personal.driver === (this.driverFilter() === 'Yes')) &&
          (!this.skillFilter() ||
            (p.hr?.training.some(
              (t) =>
                t.courseId === this.skillFilter() &&
                !!t.completed &&
                (!t.expiry || t.expiry >= this.end()),
            ) ??
              (p.progress[this.skillFilter()] ?? 0) >= 100)),
      ),
  );
  protected readonly visits = computed(() =>
    this.service.can('view')
      ? this.service
          .data()
          .visits.filter(
            (v) =>
              v.state !== 'Cancelled' &&
              v.date >= this.start() &&
              v.date <= this.end() &&
              (!this.clientId() || v.clientId === this.clientId()) &&
              (!this.clientFilter() || v.clientId === this.clientFilter()) &&
              (!this.staffFilter() || v.staffIds.includes(this.staffFilter())) &&
              (!this.locationFilter() ||
                v.address.toLowerCase().includes(this.locationFilter().toLowerCase())) &&
              (this.showUnallocated() || v.staffIds.length === v.carers) &&
              (this.allocationFilter() === 'All' ||
                (this.allocationFilter() === 'Unallocated'
                  ? v.staffIds.length < v.carers
                  : v.staffIds.length === v.carers)) &&
              (!this.skillFilter() || v.skills.includes(this.skillFilter())) &&
              (!(
                this.genderFilter() ||
                this.driverFilter() ||
                Object.values(this.trainingFilters()).some(Boolean) ||
                this.availabilityFilter()
              ) ||
                v.staffIds.some((id) => this.staff().some((p) => p.id === id))) &&
              `${v.clientName} ${v.callName} ${v.address} ${v.staffIds.map((id) => this.name(id)).join(' ')}`
                .toLowerCase()
                .includes(this.query().trim().toLowerCase()),
          )
          .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      : [],
  );
  protected readonly unallocated = computed(() =>
    this.visits().filter((v) => v.staffIds.length < v.carers),
  );
  protected readonly allocated = computed(() =>
    this.visits().filter((v) => v.staffIds.length === v.carers),
  );
  protected readonly doubleUps = computed(() => this.visits().filter((v) => v.carers === 2));
  protected readonly rosterStats = computed(() => [
    {
      label: 'Total Weekly Visits',
      value: this.visits().length,
      icon: 'calendar_month',
      tone: 'blue',
      detail: this.weeklyChange(),
      ring: -1,
    },
    {
      label: 'Allocated Visits',
      value: this.allocated().length,
      icon: 'group',
      tone: 'green',
      detail: this.percentage(this.allocated().length) + '% of total',
      ring: this.percentage(this.allocated().length),
    },
    {
      label: 'Unallocated Visits',
      value: this.unallocated().length,
      icon: 'warning',
      tone: 'red',
      detail: this.percentage(this.unallocated().length) + '% of total',
      ring: this.percentage(this.unallocated().length),
    },
    {
      label: 'Double-up Visits',
      value: this.doubleUps().length,
      icon: 'groups',
      tone: 'purple',
      detail: this.percentage(this.doubleUps().length) + '% of visits',
      ring: this.percentage(this.doubleUps().length),
    },
    {
      label: 'Staff on Rota',
      value: this.staffOnRota(),
      icon: 'person',
      tone: 'blue',
      detail: this.staffOnLeave() + ' on annual leave',
      ring: -1,
    },
    {
      label: 'Late / At Risk Visits',
      value: this.late().length,
      icon: 'warning',
      tone: 'red',
      detail: this.percentage(this.late().length) + '% of visits',
      ring: this.percentage(this.late().length),
    },
  ]);
  protected readonly totalHours = computed(() =>
    this.visits().reduce((sum, v) => sum + this.duration(v) / 60, 0),
  );
  protected readonly staffOnRota = computed(
    () => new Set(this.visits().flatMap((v) => v.staffIds)).size,
  );
  protected readonly late = computed(() =>
    this.visits().filter(
      (v) =>
        v.state === 'Published' &&
        ['Running late', 'Missed visit risk', 'Missed visit'].includes(
          liveVisit(v, this.now(), this.service.data().ecm ?? emptyEcm()).status,
        ),
    ),
  );
  protected readonly conflicts = computed(() =>
    this.visits().flatMap((v) => this.service.conflicts(v).map((issue) => ({ visit: v, issue }))),
  );
  protected readonly overtime = computed(() =>
    this.staff().filter(
      (p) =>
        p.hr?.employment.hours !== null &&
        p.hr?.employment.hours !== undefined &&
        this.hours(p.id) > p.hr.employment.hours,
    ),
  );
  protected readonly travelGaps = computed(() =>
    this.staff().filter((p) => {
      const visits = this.visits().filter((v) => v.staffIds.includes(p.id));
      return visits.some(
        (v, i) =>
          i > 0 &&
          v.date === visits[i - 1].date &&
          visitWindow(v)[0] - visitWindow(visits[i - 1])[1] > 60,
      );
    }),
  );
  protected readonly careTypes = computed(() => {
    const names = [...new Set(this.visits().map((visit) => visit.callName))];
    return (
      names.length ? names : Object.keys(this.service.data().ecm?.styles ?? emptyEcm().styles)
    ).map((name) => ({ name, background: this.callBackground(name) }));
  });
  protected readonly alerts = computed(() => [
    {
      kind: 'conflicts',
      label: 'Rota conflicts',
      count: this.conflicts().length,
      description: 'Assignments requiring review',
      icon: 'event_busy',
      tone: 'red',
    },
    {
      kind: 'late',
      label: 'Late / at risk visits',
      count: this.late().length,
      description: 'Published visits at risk of delay',
      icon: 'warning',
      tone: 'red',
    },
    {
      kind: 'skills',
      label: 'Missing required skills',
      count: this.conflicts().filter((row) => row.issue.includes('has not completed')).length,
      description: 'Assigned carers requiring training',
      icon: 'health_and_safety',
      tone: 'red',
    },
    {
      kind: 'travel',
      label: 'Large travel gaps',
      count: this.travelGaps().length,
      description: 'Carers with gaps over 60 minutes',
      icon: 'commute',
      tone: 'amber',
    },
    {
      kind: 'overtime',
      label: 'Overtime risk',
      count: this.overtime().length,
      description: 'Staff exceeding contracted hours',
      icon: 'schedule',
      tone: 'amber',
    },
  ]);
  protected viewLabel(view: string): string {
    return (
      (
        {
          Week: 'Calendar View',
          Month: 'Month View',
          List: 'List View',
          Staff: 'Staff View',
          'Service user': 'Service User View',
        } as Record<string, string>
      )[view] ?? view
    );
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('');
  }
  protected avatarColour(index: number): string {
    return ['#5badd7', '#6392d8', '#aa79dc', '#4bbd91', '#e9b54e', '#db84b3'][index % 6];
  }
  protected reviewAlert(kind: string): void {
    const visit =
      kind === 'skills'
        ? this.conflicts().find((row) => row.issue.includes('has not completed'))?.visit
        : kind === 'conflicts'
          ? this.conflicts()[0]?.visit
          : kind === 'late'
            ? this.late()[0]
            : this.visits().find((v) =>
                v.staffIds.includes(
                  (kind === 'travel' ? this.travelGaps() : this.overtime())[0]?.id ?? '',
                ),
              );
    if (visit) this.edit(visit);
  }
  protected readonly clientRows = computed(() =>
    this.service.data().clients.filter((c) => this.visits().some((v) => v.clientId === c.id)),
  );
  protected readonly calls = computed(() =>
    this.service
      .data()
      .calls.filter((c) => c.clientId === (this.clientId() || this.plan.clientId) && c.active),
  );
  protected readonly selected = signal<string[]>([]);
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly staffPage = signal(1);
  protected readonly pageStaff = computed(() =>
    this.staff().slice((this.staffPage() - 1) * 8, this.staffPage() * 8),
  );
  protected draft: RotaVisit | null = null;
  protected reason = '';
  protected plan = {
    clientId: '',
    callIds: [] as string[],
    from: this.today,
    to: addDays(this.today, 6),
    staffIds: [] as string[],
    allocation: 'Regular' as 'Regular' | 'Temporary',
  };
  protected bulkStaff: string[] = [];
  protected plans: { id: string; staffIds: string[]; original: string }[] = [];
  protected unfilled: string[] = [];
  private workspace = '';
  private sourceId = '';
  private original = '';
  protected nextMonth(date: string): string {
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  }
  protected move(direction: number): void {
    if (this.view() === 'Month') {
      const d = new Date(this.start() + 'T12:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + direction);
      this.anchor.set(d.toISOString().slice(0, 10));
    } else this.anchor.set(addDays(this.anchor(), direction * 7));
    this.selected.set([]);
  }
  protected changeDate(date: string): void {
    if (validDate(date)) {
      this.anchor.set(date);
      this.selected.set([]);
    }
  }
  protected readonly previousPage = (page: number) => Math.max(1, page - 1);
  protected readonly nextPage = (page: number) => page + 1;
  protected leaveFor(id: string, date: string) {
    return (leave: {
      personId?: string;
      person: string;
      start: string;
      end: string;
      status?: string;
    }) =>
      (leave.personId ? leave.personId === id : leave.person === this.name(id)) &&
      (!leave.status || leave.status === 'Approved') &&
      leave.start <= date &&
      leave.end >= date;
  }
  protected preferredNames(ids: string): string {
    return (
      ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => this.name(id))
        .join(', ') || 'Not recorded'
    );
  }
  protected name(id: string): string {
    return this.store.staff().find((p) => p.id === id)?.name ?? 'Unavailable carer';
  }
  protected duration(v: RotaVisit): number {
    return (minutes(v.end) - minutes(v.start) + 1440) % 1440;
  }
  protected hours(id: string): number {
    return this.service
      .data()
      .visits.filter(
        (v) =>
          v.state !== 'Cancelled' &&
          v.date >= this.start() &&
          v.date <= this.end() &&
          v.staffIds.includes(id),
      )
      .reduce((sum, v) => sum + this.duration(v) / 60, 0);
  }
  protected dayVisits(date: string, staffId = '', clientId = ''): RotaVisit[] {
    return this.visits().filter(
      (v) =>
        v.date === date &&
        (!staffId || v.staffIds.includes(staffId)) &&
        (!clientId || v.clientId === clientId),
    );
  }
  protected status(v: RotaVisit): string {
    return v.staffIds.length < v.carers
      ? 'Needs staff'
      : completedVisit(v)
        ? 'Completed'
        : v.state === 'Draft'
          ? 'Allocated · Draft'
          : liveVisit(v, this.now(), this.service.data().ecm ?? emptyEcm()).status;
  }
  protected background(v: RotaVisit): string {
    return this.callBackground(v.callName);
  }
  private callBackground(name: string): string {
    const configured = (this.service.data().ecm?.styles ?? emptyEcm().styles)[name]?.background;
    if (configured) return configured;
    const category = name.toLowerCase();
    if (category.includes('medication')) return '#d7f4e3';
    if (category.includes('domestic')) return '#fff0c7';
    if (category.includes('social')) return '#eadcfb';
    return '#dcefff';
  }
  protected toggle(id: string): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));
  }
  protected selectAll(): void {
    this.selected.set(
      this.selected().length === this.visits().length ? [] : this.visits().map((v) => v.id),
    );
  }
  protected clear(): void {
    this.filterDraft = {
      staff: '',
      client: '',
      location: '',
      skill: '',
      gender: '',
      driver: '',
      medication: '',
      handling: '',
      dementia: '',
      challenging: '',
      availability: '',
      unallocated: false,
    };
    this.trainingFilters.set({});
    this.availabilityFilter.set('');
    this.query.set('');
    this.clientFilter.set('');
    this.staffFilter.set('');
    this.locationFilter.set('');
    this.skillFilter.set('');
    this.genderFilter.set('');
    this.driverFilter.set('');
    this.allocationFilter.set('All');
    this.showUnallocated.set(true);
    this.staffPage.set(1);
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (!!this.modal()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return (
      (this.profileVisits?.canLeave() ?? true) &&
      (!this.modal() ||
        this.modal() === 'view' ||
        window.confirm('Discard the unsaved allocation?'))
    );
  }
  protected close(): void {
    if (this.canLeave()) {
      this.modal.set('');
      this.error.set('');
    }
  }
  private begin(kind: string): void {
    this.workspace = this.store.companyId();
    this.sourceId = this.clientId();
    this.reason = '';
    this.error.set('');
    this.modal.set(kind);
  }
  protected edit(v: RotaVisit): void {
    if (!this.service.can('view')) return;
    this.begin(this.service.can('manage') ? 'visit' : 'view');
    this.draft = structuredClone(v);
    this.original = JSON.stringify(v);
  }
  protected findAvailable(): void {
    const visit =
      this.visits().find((v) => this.selected().includes(v.id)) ??
      this.unallocated()[0] ??
      this.visits()[0];
    if (visit) this.edit(visit);
    else
      this.notice.set(
        'Plan a visit first to check staff against its date, times and requirements.',
      );
  }
  protected candidateList() {
    return this.draft ? this.service.candidates(this.draft) : [];
  }
  protected create(): void {
    this.begin('plan');
    this.plan = {
      clientId: this.clientId() || '',
      callIds: [],
      from: this.start(),
      to: this.end(),
      staffIds: [],
      allocation: 'Regular',
    };
  }
  protected planCalls() {
    return this.service.data().calls.filter((c) => c.clientId === this.plan.clientId && c.active);
  }
  protected prepareAuto(): void {
    this.begin('auto');
    const result = this.service.suggest(
      this.selected().length ? this.selected() : this.unallocated().map((v) => v.id),
      this.staff().map((p) => p.id),
    );
    this.plans = result.plans;
    this.unfilled = result.unfilled;
    this.reason = 'Assign available trained carers, preferring continuity and balanced hours.';
  }
  protected prepareBulk(): void {
    this.begin('bulk');
    this.bulkStaff = [];
    this.plans = this.service
      .data()
      .visits.filter((v) => this.selected().includes(v.id))
      .map((v) => ({ id: v.id, staffIds: [], original: JSON.stringify(v) }));
  }
  protected previewName(id: string): string {
    const v = this.service.data().visits.find((v) => v.id === id);
    return v ? `${v.date} ${v.start} · ${v.clientName} · ${v.callName}` : id;
  }
  protected save(): void {
    if (this.sourceId !== this.clientId()) {
      this.error.set('Selected service user changed. Reopen the planner.');
      return;
    }
    let error: string | null = null;
    if (this.modal() === 'visit')
      error = this.service.updateVisit(this.draft!, this.workspace, this.original, this.reason);
    else if (this.modal() === 'plan') {
      if (this.workspace !== this.store.companyId()) {
        this.error.set('Workspace changed. Reopen the planner.');
        return;
      }
      error = this.service.generate(
        this.plan.clientId,
        this.plan.callIds,
        this.plan.from,
        this.plan.to,
        this.plan.staffIds.length ? this.plan.staffIds : null,
        this.plan.allocation,
      );
    } else {
      if (this.modal() === 'bulk')
        this.plans = this.plans.map((p) => ({ ...p, staffIds: [...this.bulkStaff] }));
      error = this.service.bulkAllocate(this.plans, this.workspace, this.reason);
    }
    if (error) {
      this.error.set(error);
      return;
    }
    this.modal.set('');
    this.selected.set([]);
    this.notice.set('Visit allocations saved. Drafts require publishing before delivery.');
  }
  protected exportRows(): unknown[][] {
    return [
      [
        'Date',
        'Start',
        'End',
        'Service user',
        'Call',
        'Carers',
        'Status',
        'Task',
        'Mileage',
        'Time sensitive',
      ],
      ...this.visits().map((v) => [
        v.date,
        v.start,
        v.end,
        v.clientName,
        v.callName,
        v.staffIds.map((id) => this.name(id)).join('; '),
        this.status(v),
        v.taskType,
        v.mileage,
        v.timeSensitive ? 'Yes' : 'No',
      ]),
    ];
  }
  protected export(): void {
    if (this.service.can('export'))
      this.store.download('visit-planner.csv', csv(this.exportRows()), 'text/csv');
  }
  protected exportExcel(): void {
    if (this.service.can('export'))
      downloadWorkbook('visit-planner.xlsx', this.exportRows(), 'Visit schedule');
  }
  protected print(): void {
    if (this.service.can('export')) window.print();
  }
}
