import { ServiceUserState } from '../shared/service-user-state';
import { ProfileVisits } from './profile-visits';
import { ViewChild } from '@angular/core';
import { downloadWorkbook } from './workbook';
import {
  HostListener,
  Component,
  DestroyRef,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { COURSES } from '../shared/management.store';
import { RosterApi } from '../rota/roster-api.service';
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
  providers: [RosterApi],
  imports: [
    ServiceUserState,
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
  protected readonly preparing = signal(false);
  private suggestionGeneration = 0;
  private editorGeneration = 0;
  private pendingPlan: { scope: string; client: string } | null = null;
  constructor() {
    effect(() => {
      const scope = this.service.scope();
      const id = this.clientId();
      const readable = this.service.readable();
      untracked(() => {
        if (this.pendingPlan && (this.pendingPlan.scope !== scope || !readable))
          this.pendingPlan = null;
        this.suggestionGeneration++;
        this.editorGeneration++;
        this.preparing.set(false);
        this.plans = [];
        this.unfilled = [];
        this.modal.set('');
        this.draft = null;
        this.selected.set([]);
        if (id && readable) void this.service.records.detail(id);
      });
    });
    effect(() => {
      this.service.scope();
      const id = this.clientId();
      const start = this.overviewView ? this.start() : addDays(this.start(), -7);
      const end =
        this.view() === 'Month' && !this.overviewView ? this.monthDays().at(-1)! : this.end();
      const filters = this.overviewView
        ? {
            client: this.clientFilter(),
            staff: this.staffFilter(),
            location: this.locationFilter(),
            skill: this.skillFilter(),
            gender: this.genderFilter(),
            driver: this.driverFilter(),
            availability: String(!!this.availabilityFilter()),
            show_unallocated: String(this.showUnallocated()),
            allocation: this.allocationFilter(),
            search: this.query().trim(),
            ...this.trainingFilters(),
          }
        : undefined;
      if (this.overviewView) this.now();
      if (!id)
        untracked(() => {
          if (this.service.can('view')) void this.loadPeriod(start, end, filters);
        });
    });
    const timer = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private async openLinkedVisit(id: string): Promise<void> {
    const scope = this.service.scope();
    const generation = ++this.editorGeneration;
    try {
      const row = await this.service.detailVisit(id);
      if (scope !== this.service.scope() || generation !== this.editorGeneration) return;
      if (this.clientId() && row.clientId !== this.clientId())
        throw Error('This visit belongs to another service user.');
      this.anchor.set(row.date);
      await this.edit(row);
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { visit: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'This visit is unavailable.');
    }
  }
  private async loadPeriod(
    start: string,
    end: string,
    filters?: Record<string, string>,
  ): Promise<void> {
    if (filters) for (const key of Object.keys(filters)) if (!filters[key]) delete filters[key];
    if (!(await this.service.load(start, end, '', false, filters))) return;
    const visible = new Set(this.visits().map((v) => v.id));
    this.selected.update((ids) => ids.filter((id) => visible.has(id)));
    const id = this.route.snapshot.queryParamMap.get('visit');
    if (id && !this.modal()) {
      const row = this.service.data().visits.find((v) => v.id === id);
      if (row) await this.edit(row);
    }
    this.openPendingPlan();
  }
  private openPendingPlan(): void {
    const pending = this.pendingPlan;
    if (!pending) return;
    if (
      pending.scope !== this.service.scope() ||
      !this.service.can('create') ||
      pending.client !== (this.clientId() || this.clientFilter())
    ) {
      this.pendingPlan = null;
      return;
    }
    if (!this.service.raw() || this.service.loading() || this.modal()) return;
    this.pendingPlan = null;
    this.create();
    this.plan.clientId = pending.client;
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
      if (params.get('plan') === 'true' && this.service.can('create')) {
        this.pendingPlan = {
          scope: this.service.scope(),
          client: this.clientId() || params.get('client') || '',
        };
        queueMicrotask(() => this.openPendingPlan());
      }
      if (params.get('visit')) {
        void this.openLinkedVisit(params.get('visit')!);
        const visit = this.service.data().visits.find((v) => v.id === params.get('visit'));
        if (visit) {
          this.anchor.set(visit.date);
          this.edit(visit);
        }
      }
      if (params.get('plan') === 'true') {
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
  protected readonly service = inject(RosterApi);
  protected readonly store = this.service.store;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly overviewView = this.route.snapshot.data['visitsOverview'] === true;
  protected readonly workspaceView = this.route.snapshot.data['visitsWorkspace'] === true;
  protected readonly clientId = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.service.records.selected()?.id === this.clientId()
      ? this.service.records.selected()!
      : this.service.data().clients.find((c) => c.id === this.clientId()),
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
  private trained(person: ReturnType<RosterApi['staff']>[number], course: string): boolean {
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
  protected get courses() {
    return this.overviewView
      ? (this.service.overview()?.training_options ?? []).map((course) => ({
          id: course.id,
          title: course.name,
        }))
      : COURSES;
  }
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
          (!(this.overviewView && !this.service.access.can('people', 'records', 'read')) ||
            !Object.values(this.trainingFilters()).some(Boolean)) &&
          Object.entries(this.trainingFilters()).every(
            ([course, required]) => !required || this.trained(p, course) === (required === 'Yes'),
          ) &&
          (!this.availabilityFilter() ||
            p.hr.availableDays?.some((date) => date >= this.start() && date <= this.end()) ===
              true) &&
          (!this.genderFilter() || p.hr?.personal.gender === this.genderFilter()) &&
          (!this.driverFilter() || p.hr?.personal.driver === (this.driverFilter() === 'Yes')) &&
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
  protected readonly visits = computed(() => {
    if (this.overviewView) {
      const ids = new Set(this.service.overview()?.matching_visit_ids ?? []);
      return this.service.can('view')
        ? this.service
            .data()
            .visits.filter((v) => ids.has(v.id))
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        : [];
    }
    return this.service.can('view')
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
              (this.showUnallocated() ||
                (v.requirementsRecorded !== false &&
                  v.carers > 0 &&
                  v.staffIds.length === v.carers)) &&
              (this.allocationFilter() === 'All' ||
                (this.allocationFilter() === 'Unallocated'
                  ? v.requirementsRecorded === false || v.staffIds.length < v.carers
                  : v.requirementsRecorded !== false &&
                    v.carers > 0 &&
                    v.staffIds.length === v.carers)) &&
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
      : [];
  });
  protected readonly unallocated = computed(() =>
    this.visits().filter((v) => !v.requirementsRecorded || v.staffIds.length < v.carers),
  );
  protected readonly allocated = computed(() =>
    this.visits().filter(
      (v) => v.requirementsRecorded && v.carers > 0 && v.staffIds.length === v.carers,
    ),
  );
  protected readonly doubleUps = computed(() => this.visits().filter((v) => v.carers === 2));
  protected readonly rosterStats = computed(() => {
    if (this.overviewView) return this.overviewStats();
    return [
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
    ];
  });
  private overviewStats() {
    const data = this.service.overview();
    const definitions = [
      ['total', 'Total Weekly Visits', 'calendar_month', 'blue'],
      ['allocated', 'Allocated Visits', 'group', 'green'],
      ['unallocated', 'Unallocated Visits', 'warning', 'red'],
      ['double_up', 'Double-up Visits', 'groups', 'purple'],
      ['staff', 'Staff on Rota', 'person', 'blue'],
      ['late', 'Late / At Risk Visits', 'warning', 'red'],
    ];
    return definitions.map(([key, label, icon, tone]) => {
      const metric = data?.metrics.find((m) => m.key === key);
      let detail =
        metric?.percentage == null
          ? 'Unavailable'
          : metric.percentage + (key === 'double_up' ? '% of visits' : '% of total');
      if (key === 'total')
        detail = data
          ? data.change_percentage == null
            ? 'No visits in previous period'
            : data.change_percentage + '% vs previous period'
          : 'Unavailable';
      if (key === 'staff')
        detail =
          data?.staff_on_leave == null
            ? 'Annual leave unavailable'
            : data.staff_on_leave + ' on annual leave';
      return {
        label,
        icon,
        tone,
        value: metric?.value ?? '—',
        detail,
        ring: metric?.percentage ?? -1,
      };
    });
  }
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
  protected readonly alerts = computed(() => {
    const rows = [
      {
        kind: 'conflicts',
        label: 'Rota conflicts',
        count: this.overviewView ? 0 : this.conflicts().length,
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
        count: this.overviewView
          ? 0
          : this.conflicts().filter((row) => row.issue.includes('has not completed')).length,
        description: 'Assigned carers requiring training',
        icon: 'health_and_safety',
        tone: 'red',
      },
      {
        kind: 'travel',
        label: 'Large travel gaps',
        count: this.overviewView ? 0 : this.travelGaps().length,
        description: 'Carers with gaps over 60 minutes',
        icon: 'commute',
        tone: 'amber',
      },
      {
        kind: 'overtime',
        label: 'Overtime risk',
        count: this.overviewView ? 0 : this.overtime().length,
        description: 'Staff exceeding contracted hours',
        icon: 'schedule',
        tone: 'amber',
      },
    ];
    return this.overviewView
      ? rows.map((row) => ({
          ...row,
          count: this.service.overview()?.alerts.find((a) => a.kind === row.kind)?.count ?? '—',
        }))
      : rows;
  });
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
    if (this.overviewView) {
      const id = this.service.overview()?.alerts.find((a) => a.kind === kind)?.visit_id;
      const visit = this.visits().find((v) => v.id === id);
      if (visit) this.edit(visit);
      return;
    }
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
    if (this.overviewView)
      return this.service.overview()?.visit_statuses?.[v.id] ?? 'Status unavailable';
    if (v.state === 'Cancelled') return 'Cancelled';
    if (v.requirementsRecorded === false) return 'Requirements not recorded';
    if (v.state === 'Published' && this.service.raw()?.attendance_available === false)
      return 'Attendance unavailable';
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
    if (this.modal() && this.modal() !== 'view') {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    if (this.service.saving()) return false;
    return (
      (this.profileVisits?.canLeave() ?? true) &&
      (!this.modal() ||
        this.modal() === 'view' ||
        window.confirm('Discard the unsaved allocation?'))
    );
  }
  protected close(): void {
    if (this.service.saving()) return;
    if (this.canLeave()) {
      this.suggestionGeneration++;
      this.editorGeneration++;
      this.preparing.set(false);
      this.modal.set('');
      this.error.set('');
    }
  }
  private begin(kind: string): void {
    this.editorGeneration++;
    this.suggestionGeneration++;
    this.preparing.set(false);
    this.plans = [];
    this.unfilled = [];
    this.workspace = this.store.companyId();
    this.sourceId = this.clientId();
    this.reason = '';
    this.error.set('');
    this.modal.set(kind);
  }
  protected async edit(v: RotaVisit): Promise<void> {
    if (!this.service.can('view') || this.service.saving()) return;
    const scope = this.service.scope();
    const generation = ++this.editorGeneration;
    try {
      const fresh = await this.service.detailVisit(v.id);
      if (scope !== this.service.scope() || generation !== this.editorGeneration) return;
      this.begin(
        this.service.can('edit') &&
          fresh.requirementsRecorded &&
          !fresh.attendance.length &&
          fresh.state !== 'Cancelled'
          ? 'visit'
          : 'view',
      );
      this.draft = fresh;
      this.original = JSON.stringify(fresh);
      void this.service.loadCandidates(fresh);
    } catch (e) {
      if (scope === this.service.scope() && generation === this.editorGeneration)
        this.error.set(e instanceof Error ? e.message : 'This visit is unavailable.');
    }
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
    if (!this.service.can('create') || this.service.saving()) return;
    this.pendingPlan = null;
    this.begin('plan');
    this.plan = {
      clientId: this.clientId() || this.clientFilter() || '',
      callIds: [],
      from: this.start(),
      to: this.end(),
      staffIds: [],
      allocation: 'Regular',
    };
  }
  protected planCalls() {
    return this.service
      .data()
      .calls.filter((c) => c.clientId === this.plan.clientId && c.active && c.scheduleRecorded);
  }
  protected async prepareAuto(): Promise<void> {
    if (
      !this.service.can('edit') ||
      this.service.saving() ||
      this.service.loading() ||
      this.preparing()
    )
      return;
    const ids = this.selected().length
      ? this.visits()
          .filter((v) => this.selected().includes(v.id))
          .map((v) => v.id)
      : this.unallocated().map((v) => v.id);
    if (!ids.length) return;
    this.begin('auto');
    const generation = this.suggestionGeneration;
    const scope = this.service.scope();
    this.preparing.set(true);
    try {
      const result = await this.service.suggest(
        ids,
        this.staff().map((p) => p.id),
      );
      if (
        generation !== this.suggestionGeneration ||
        scope !== this.service.scope() ||
        this.modal() !== 'auto'
      )
        return;
      this.plans = result.plans;
      this.unfilled = result.unfilled;
      this.reason = 'Assign available trained carers, preferring continuity and balanced hours.';
    } catch (e) {
      if (generation === this.suggestionGeneration && scope === this.service.scope())
        this.error.set(e instanceof Error ? e.message : 'Suggestions are unavailable.');
    } finally {
      if (generation === this.suggestionGeneration) this.preparing.set(false);
    }
  }
  protected prepareBulk(): void {
    if (!this.service.can('edit') || this.service.saving() || this.service.loading()) return;
    const rows = this.visits().filter((v) => this.selected().includes(v.id));
    if (!rows.length) return;
    this.begin('bulk');
    this.bulkStaff = [];
    this.plans = rows.map((v) => ({ id: v.id, staffIds: [], original: JSON.stringify(v) }));
  }
  protected previewName(id: string): string {
    const v = this.service.data().visits.find((v) => v.id === id);
    return v ? `${v.date} ${v.start} · ${v.clientName} · ${v.callName}` : id;
  }
  protected async save(): Promise<void> {
    if (this.service.saving() || this.preparing()) return;
    if (
      !this.service.can(this.modal() === 'plan' ? 'create' : 'edit') ||
      !['plan', 'visit', 'bulk', 'auto'].includes(this.modal())
    )
      return;
    if (['auto', 'bulk'].includes(this.modal()) && !this.plans.length) return;
    const scope = this.service.scope();
    if (this.sourceId !== this.clientId()) {
      this.error.set('Selected service user changed. Reopen the planner.');
      return;
    }
    let error: string | null = null;
    if (this.modal() === 'visit')
      error = await this.service.updateVisit(
        this.draft!,
        this.workspace,
        this.original,
        this.reason,
      );
    else if (this.modal() === 'plan') {
      if (this.workspace !== this.store.companyId()) {
        this.error.set('Workspace changed. Reopen the planner.');
        return;
      }
      error = await this.service.generate(
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
      error = await this.service.bulkAllocate(this.plans, this.workspace, this.reason);
    }
    if (scope !== this.service.scope()) return;
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
  private async authoriseExport(): Promise<boolean> {
    const hr = !!(
      this.genderFilter() ||
      this.driverFilter() ||
      this.skillFilter() ||
      Object.values(this.trainingFilters()).some(Boolean)
    );
    if (hr && !this.service.access.can('people', 'records', 'export')) {
      this.error.set(
        'Staff Records export access is required to export results filtered by staff attributes or training.',
      );
      return false;
    }
    if (
      this.availabilityFilter() &&
      (!this.service.access.can('people', 'records', 'export') ||
        !this.service.access.can('people', 'leave', 'export'))
    ) {
      this.error.set(
        'Staff Records and Availability and Leave export access is required for this availability filter.',
      );
      return false;
    }
    return this.service.can('export') && (await this.service.refresh(true));
  }
  protected async export(): Promise<void> {
    if (await this.authoriseExport())
      this.store.download('visit-planner.csv', csv(this.exportRows()), 'text/csv');
  }
  protected async exportExcel(): Promise<void> {
    if (await this.authoriseExport())
      downloadWorkbook('visit-planner.xlsx', this.exportRows(), 'Visit schedule');
  }
  protected async print(): Promise<void> {
    if (await this.authoriseExport()) window.print();
  }
}
