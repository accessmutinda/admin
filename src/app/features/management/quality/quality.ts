import { CompanyAccessService } from '../../../core/access/company-access.service';
import { QualityNavigation } from './quality-navigation-bar';
import { WorkspaceCards } from '../shared/workspace-cards';
import { QuickActions } from '../shared/quick-actions';
import { ModuleDesign } from '../shared/module-design';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../../shared/ui/toast.service';
import { AccessRequired } from '../shared/access-required';
import { QualityApi } from './quality-api.service';
import { QualityService } from './quality.service';
import {
  ASSESSMENT_TEMPLATES,
  Assessment,
  CorrectiveAction,
  templateFor,
  ukTimestamp,
  actionOverdue,
  assessmentOverdue,
} from './quality.models';

@Component({
  selector: 'cv-quality',
  imports: [
    QualityNavigation,
    QuickActions,
    WorkspaceCards,
    ModuleDesign,
    DatePipe,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    AccessRequired,
  ],
  host: { class: 'module-page operations-page quality-page' },
  templateUrl: './quality.html',
  styleUrl: './quality.css',
})
export class Quality {
  protected readonly service = inject(QualityService);
  protected readonly api = this.service.connected ? (this.service as unknown as QualityApi) : null;
  protected readonly access = inject(CompanyAccessService);
  protected readonly store = this.service.store;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly supervisor = this.route.snapshot.data['supervisor'] === true;
  protected readonly destinations = [
    {
      view: 'Assessment library',
      icon: 'library_books',
      description: 'Find the right assessment form.',
    },
    {
      view: 'Assessments',
      icon: 'assignment',
      description: 'Continue drafts and review submitted records.',
    },
    {
      view: 'Corrective actions',
      icon: 'task_alt',
      description: 'Track owners, due dates and resolutions.',
    },
    {
      view: 'Review schedule',
      icon: 'calendar_month',
      description: 'Plan assessments and follow-up reviews.',
    },
    {
      view: 'Reports',
      icon: 'bar_chart',
      description: 'Review outcomes, exports and saved history.',
    },
  ];
  protected readonly tabs = [
    'Overview',
    'Assessment library',
    'Assessments',
    'Corrective actions',
    'Review schedule',
    'Reports',
  ];
  protected readonly tab = signal(
    this.tabs.includes(this.route.snapshot.queryParamMap.get('tab') ?? '')
      ? this.route.snapshot.queryParamMap.get('tab')!
      : 'Overview',
  );
  protected readonly search = signal('');
  protected readonly category = signal('All');
  protected readonly status = signal('All');
  protected get templates() {
    return this.api ? this.api.templates() : ASSESSMENT_TEMPLATES;
  }
  protected readonly categories = [
    'All',
    'Care assessments',
    'Quality assurance',
    'People & training',
  ];
  protected readonly month = signal(this.service.today().slice(0, 7));
  protected readonly actionModal = signal(false);
  protected readonly error = signal('');
  protected action!: CorrectiveAction;
  private calendarScope: string | null = null;
  protected readonly filteredTemplates = computed(() =>
    this.templates.filter(
      (t) =>
        (this.category() === 'All' || t.category === this.category()) &&
        (t.title + ' ' + t.description).toLowerCase().includes(this.search().toLowerCase()),
    ),
  );
  protected readonly assessments = computed(() =>
    this.service
      .data()
      .assessments.filter(
        (a) =>
          (this.status() === 'All' ||
            a.status === this.status() ||
            (this.status() === 'Overdue' && assessmentOverdue(a, this.service.today()))) &&
          `${this.template(a.templateId)?.title} ${a.subjectName} ${a.assessorName} ${a.date} ${a.status}`
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  protected readonly actions = computed(() =>
    this.service
      .data()
      .actions.filter(
        (a) =>
          (this.status() === 'All' ||
            a.status === this.status() ||
            (this.status() === 'Overdue' && actionOverdue(a, this.service.today()))) &&
          `${a.title} ${this.owner(a.ownerId)} ${a.due}`
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => a.due.localeCompare(b.due)),
  );
  protected readonly openAssessments = computed(() =>
    this.service.data().assessments.filter((a) => a.status !== 'Signed off'),
  );
  protected readonly overdueAssessments = computed(() =>
    this.openAssessments().filter((a) => assessmentOverdue(a, this.service.today())),
  );
  protected readonly openActions = computed(() =>
    this.service.data().actions.filter((a) => a.status !== 'Completed'),
  );
  protected readonly overdueActions = computed(() =>
    this.openActions().filter((a) => actionOverdue(a, this.service.today())),
  );
  protected readonly pendingSignOff = computed(() =>
    this.service.data().assessments.filter((a) => a.status === 'Submitted'),
  );
  protected readonly myTasks = computed(() =>
    this.openAssessments()
      .filter((a) => a.assessorId === this.service.auth.currentUser()?.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5),
  );
  protected readonly activity = computed(() =>
    [
      ...this.service.data().assessments.flatMap((a) =>
        a.audit.map((e) => ({
          ...e,
          auditId: e.id,
          title: this.template(a.templateId)?.title,
          id: a.id,
          kind: 'assessment',
        })),
      ),
      ...this.service
        .data()
        .actions.flatMap((a) =>
          a.audit.map((e) => ({ ...e, auditId: e.id, title: a.title, id: a.id, kind: 'action' })),
        ),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5),
  );
  protected readonly monthEvents = computed(() =>
    [
      ...this.service.data().assessments.flatMap((a) => [
        {
          id: a.id,
          date: a.date,
          title: this.template(a.templateId)?.title ?? 'Assessment',
          person: a.subjectName || 'Context needed',
          status: a.status,
          kind: 'assessment',
        },
        ...(a.reviewDate
          ? [
              {
                id: a.id,
                date: a.reviewDate,
                title: 'Next review · ' + this.template(a.templateId)?.title,
                person: a.subjectName,
                status: 'Follow-up',
                kind: 'assessment',
              },
            ]
          : []),
      ]),
      ...this.service
        .data()
        .actions.filter((a) => a.status !== 'Completed')
        .map((a) => ({
          id: a.id,
          date: a.due,
          title: a.title,
          person: this.owner(a.ownerId),
          status: a.status,
          kind: 'action',
        })),
      ...this.store
        .data()
        .reviews.filter((r) => r.status !== 'Completed')
        .map((r) => ({
          id: r.id,
          date: r.date,
          title: r.type,
          person: r.person,
          status: r.status,
          kind: 'staff',
        })),
    ]
      .filter((e) => e.date.startsWith(this.month()))
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  protected readonly days = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    if (!year || !month) return [];
    const first = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return [
      ...Array(first).fill(null),
      ...Array.from({ length: count }, (_, i) => ({
        day: i + 1,
        date: this.month() + '-' + String(i + 1).padStart(2, '0'),
      })),
    ];
  });
  protected template = (id: string) =>
    this.api
      ? (this.service.data().assessments.find((a) => a.templateId === id) as any)?.template ||
        this.api.templates().find((t) => t.id === id)
      : templateFor(id);
  constructor() {
    inject(DestroyRef).onDestroy(() => this.api?.disconnect());
    this.api?.connect(this.tab());
    effect(() => {
      const scope = this.api?.scope();
      const company = this.api?.store.company();
      const today = this.api?.today();
      if (company && scope && today && this.calendarScope !== scope) {
        this.calendarScope = scope;
        untracked(() => this.month.set(today.slice(0, 7)));
      }
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const selected = params.get('tab') ?? 'Overview';
      const next = this.tabs.includes(selected) ? selected : 'Overview';
      if (next !== this.tab()) {
        this.tab.set(next);
        this.api?.setView(next);
        this.search.set('');
        this.status.set('All');
        this.category.set('All');
      }
    });
    const context = computed(() =>
      this.api ? `${this.api.scope()}:${this.api.can('view')}` : null,
    );
    effect(() => {
      if (context())
        untracked(() => {
          this.actionModal.set(false);
          this.error.set('');
          this.action = undefined as any;
          this.search.set('');
          this.status.set('All');
        });
    });
  }
  protected timestamp = ukTimestamp;
  protected canCreateAssessment() {
    return this.api ? this.api.canCreateAssessment() : this.service.can('create');
  }
  protected isOverdue = (a: Assessment) => assessmentOverdue(a, this.service.today());
  protected actionLate = (a: CorrectiveAction) => actionOverdue(a, this.service.today());
  protected owner(id: string): string {
    return (
      (this.api ? this.api.members() : this.service.assessors()).find((m) => m.id === id)?.name ??
      'Former team member'
    );
  }
  protected events(date: string) {
    return this.monthEvents().filter((e) => e.date === date);
  }
  protected canTab(tab: string): boolean {
    if (this.api) return this.api.canTab(tab);
    return this.access.can(
      'quality',
      this.supervisor
        ? 'supervision'
        : tab === 'Corrective actions'
          ? 'actions'
          : tab === 'Reports'
            ? 'reports'
            : 'assessments',
    );
  }
  protected switchTab(tab: string): void {
    if (!this.canTab(tab)) return;
    this.tab.set(tab);
    this.api?.setView(tab);
    this.search.set('');
    this.status.set('All');
    this.category.set('All');
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
  protected moveMonth(offset: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1 + offset, 1));
    this.month.set(next.toISOString().slice(0, 7));
  }
  protected canEditAction(): boolean {
    return this.api
      ? this.api.canAction(this.action.revision ? 'edit' : 'create') &&
          !this.api.saving() &&
          this.service.data().actions.find((a) => a.id === this.action.id)?.status !== 'Completed'
      : this.service.can(this.action.revision ? 'edit' : 'create');
  }
  protected editAction(a?: CorrectiveAction): void {
    this.action = a
      ? structuredClone(a)
      : {
          id: crypto.randomUUID(),
          assessmentId: '',
          title: '',
          ownerId: (this.api ? this.api.owners() : this.service.assessors())[0]?.id ?? '',
          due: this.service.today(),
          priority: 'Standard',
          status: 'Open',
          resolution: '',
          revision: 0,
          audit: [],
        };
    this.error.set('');
    this.actionModal.set(true);
  }
  protected async saveAction(): Promise<void> {
    const error = await (this.service.saveAction(this.action) as
      string | null | Promise<string | null>);
    this.error.set(error ?? '');
    if (!error) {
      this.actionModal.set(false);
      this.toast.success('Quality action saved.');
    }
  }
  protected openEvent(event: { kind: string; id: string }): void {
    if (event.kind === 'assessment')
      this.router.navigate(['/manage/quality/assessments', event.id]);
    else if (event.kind === 'staff') this.router.navigateByUrl('/manage/reviews');
    else {
      const a = this.service.data().actions.find((a) => a.id === event.id);
      if (a) this.editAction(a);
    }
  }
  protected countType(id: string, status?: string): number {
    return this.service
      .data()
      .assessments.filter((a) => a.templateId === id && (!status || a.status === status)).length;
  }
  protected exportReport(): void {
    if (this.api) {
      void this.api.exportReport().catch((error) => this.error.set(error.message));
      return;
    }
    if (!this.service.can('export')) return;
    const report = {
      company: this.store.company()?.name,
      generated: new Date().toISOString(),
      assessments: this.service.data().assessments.map(({ evidence, ...a }) => ({
        ...a,
        evidence: evidence.map(({ content, ...e }) => e),
      })),
      actions: this.service.data().actions,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quality-report-' + this.service.today() + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
