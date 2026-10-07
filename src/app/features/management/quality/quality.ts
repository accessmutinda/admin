import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { AccessRequired } from '../shared/access-required';
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
    DatePipe,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    AccessRequired,
  ],
  templateUrl: './quality.html',
  styleUrl: './quality.css',
})
export class Quality {
  protected readonly service = inject(QualityService);
  protected readonly store = this.service.store;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly supervisor = this.route.snapshot.data['supervisor'] === true;
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
  protected readonly templates = ASSESSMENT_TEMPLATES;
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
          `${templateFor(a.templateId)?.title} ${a.subjectName} ${a.assessorName} ${a.date} ${a.status}`
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
          title: templateFor(a.templateId)?.title,
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
          title: templateFor(a.templateId)?.title ?? 'Assessment',
          person: a.subjectName || 'Context needed',
          status: a.status,
          kind: 'assessment',
        },
        ...(a.reviewDate
          ? [
              {
                id: a.id,
                date: a.reviewDate,
                title: 'Next review · ' + templateFor(a.templateId)?.title,
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
  protected template = templateFor;
  protected timestamp = ukTimestamp;
  protected isOverdue = (a: Assessment) => assessmentOverdue(a, this.service.today());
  protected actionLate = (a: CorrectiveAction) => actionOverdue(a, this.service.today());
  protected owner(id: string): string {
    return this.service.assessors().find((m) => m.id === id)?.name ?? 'Former team member';
  }
  protected events(date: string) {
    return this.monthEvents().filter((e) => e.date === date);
  }
  protected switchTab(tab: string): void {
    this.tab.set(tab);
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
  protected editAction(a?: CorrectiveAction): void {
    this.action = a
      ? structuredClone(a)
      : {
          id: crypto.randomUUID(),
          assessmentId: '',
          title: '',
          ownerId: this.service.assessors()[0]?.id ?? '',
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
  protected saveAction(): void {
    const error = this.service.saveAction(this.action);
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
