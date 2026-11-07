import {
  Component,
  DestroyRef,
  HostListener,
  NgZone,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../../shared/ui/select';
import { londonDate, londonInstant } from '../../rota/rota.models';
import { AcademyService } from './academy.service';
import { AcademyDemoWorkflow } from './academy-demo-workflow';
import { AcademyAttempt, AcademySyncStatus } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-results-review',
  imports: [
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    MatMenuModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
  ],
  templateUrl: './academy-results-review.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-results-review.css'],
})
export class AcademyResultsReview {
  protected readonly academy = inject(AcademyService);
  private readonly workflow = inject(AcademyDemoWorkflow);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly result = computed(() => {
    if (!this.academy.canViewEvidence()) return undefined;
    const attempt = this.academy.attempt(this.params().get('attemptId') ?? '');
    return attempt?.submittedAt ? attempt : undefined;
  });
  protected readonly job = computed(() => {
    const result = this.result();
    return result && !result.groupId && result.passed && result.groupKind !== 'Survey'
      ? this.academy
          .state()
          .completions?.find(
            (j) =>
              j.attemptId === result.id &&
              j.assignmentId === result.assignmentId &&
              j.personId === result.personId &&
              j.tenantId === this.academy.store.companyId(),
          )
      : undefined;
  });
  protected readonly certificate = computed(() => {
    const a = this.result();
    return a
      ? this.academy
          .state()
          .certificates.find(
            (c) =>
              c.passedAttemptId === a.id &&
              c.assignmentId === a.assignmentId &&
              c.personId === a.personId,
          )
      : undefined;
  });
  protected readonly tab = signal('Assessment Result & Workflow');
  protected readonly tabs = [
    'Assessment Result & Workflow',
    'Retakes & Outstanding Actions',
    'Automation & Integration Status',
  ];
  protected period = '30';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly scheduling = signal<AcademyAttempt | null>(null);
  protected scheduleDate = '';
  protected readonly scheduleError = signal('');
  protected readonly now = signal(Date.now());
  private readonly workspace = this.academy.store.companyId();
  constructor() {
    effect(() => {
      this.academy.canViewEvidence();
      this.params();
      this.scheduling.set(null);
      this.scheduleError.set('');
      this.error.set('');
      this.notice.set('');
    });
    const clock = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => this.now.set(Date.now()), 1000),
    );
    inject(DestroyRef).onDestroy(() => clearInterval(clock));
  }
  protected name(id: string) {
    return this.academy.store.staff().find((p) => p.id === id)?.name ?? 'Unavailable staff record';
  }
  protected assignment(attempt = this.result()) {
    return attempt
      ? this.academy
          .assignments()
          .find((a) => a.id === attempt.assignmentId && a.personId === attempt.personId)
      : undefined;
  }
  protected history(attempt = this.result()) {
    return attempt
      ? this.academy
          .state()
          .attempts.filter(
            (a) =>
              a.assignmentId === attempt.assignmentId &&
              (a.groupId ?? '') === (attempt.groupId ?? ''),
          )
          .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      : [];
  }
  protected attemptNumber(attempt = this.result()) {
    return this.history(attempt).findIndex((a) => a.id === attempt?.id) + 1;
  }
  protected policy(attempt = this.result()) {
    return (
      this.assignment(attempt)?.policySnapshot ??
      attempt?.policy ?? { ...this.academy.state().settings, retakeWaitHours: 0 }
    );
  }
  protected availability(attempt: AcademyAttempt) {
    const assignment = this.assignment(attempt);
    return assignment
      ? this.academy.assessmentAvailability(assignment, this.now(), attempt.groupId ?? '')
      : undefined;
  }
  protected plan(attempt: AcademyAttempt) {
    return this.academy
      .state()
      .retakePlans?.find((p) => p.fromAttemptId === attempt.id && !p.startedAttemptId);
  }
  protected outstanding() {
    const latest = new Map<string, AcademyAttempt>();
    for (const attempt of this.academy
      .state()
      .attempts.filter(
        (a) => !!a.submittedAt && !a.invalidatedAt && this.academy.can('evidence', a.personId),
      )
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)))
      latest.set(attempt.assignmentId + ':' + (attempt.groupId ?? ''), attempt);
    const since = this.period === 'all' ? 0 : this.now() - Number(this.period) * 86400000;
    return [...latest.values()]
      .filter(
        (a) =>
          !a.passed &&
          a.groupKind !== 'Survey' &&
          Date.parse(a.submittedAt) >= since &&
          !!this.assignment(a) &&
          !this.assignment(a)!.archived &&
          !this.assignment(a)!.completedAt,
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  protected canSchedule(attempt: AcademyAttempt) {
    const history = this.history(attempt),
      assignment = this.assignment(attempt),
      available = this.availability(attempt);
    return (
      this.academy.can('assign', attempt.personId) &&
      !attempt.invalidatedAt &&
      !attempt.passed &&
      attempt.groupKind !== 'Survey' &&
      !!assignment &&
      !assignment.archived &&
      !assignment.completedAt &&
      !available?.runningId &&
      (available?.remaining ?? 0) > 0 &&
      !history.some((a) => a.passed) &&
      history.filter((a) => a.submittedAt).at(-1)?.id === attempt.id
    );
  }
  protected retakeStatus(attempt: AcademyAttempt) {
    const available = this.availability(attempt);
    return available?.runningId
      ? 'Retake in progress'
      : !available?.remaining
        ? 'Manager review required'
        : this.plan(attempt)
          ? 'Retake scheduled'
          : available?.readyAt
            ? 'Waiting period'
            : 'Retake available';
  }
  protected score(attempt: AcademyAttempt) {
    return attempt.groupKind === 'Survey'
      ? 'Not graded'
      : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(attempt.score ?? 0) +
          '%';
  }
  protected feedback() {
    const a = this.result();
    return !a
      ? ''
      : a.groupKind === 'Survey'
        ? 'Survey responses recorded. This feedback is not graded and does not issue a course certificate.'
        : a.criticalFailed
          ? 'A critical pass condition was not met. Review the permitted feedback and the assigned retake policy.'
          : a.passed
            ? `Passed with ${this.score(a)} against the ${a.passMark}% threshold. Knowledge completion is separate from practical competency.`
            : `Not passed: ${this.score(a)} against the ${a.passMark}% threshold. Review the permitted feedback before an available retake.`;
  }
  protected ack(stage: AcademySyncStatus) {
    return this.job()?.acknowledgements.find((a) => a.stage === stage);
  }
  protected steps() {
    const a = this.result();
    const post: { label: string; icon: string; stage: AcademySyncStatus }[] = [
      {
        label: 'Internal certificate generated',
        icon: 'workspace_premium',
        stage: 'CERTIFICATE_GENERATED',
      },
      {
        label: 'Certificate saved to HR staff file',
        icon: 'folder',
        stage: 'TRAINING_RECORD_PENDING',
      },
      { label: 'Training matrix updated', icon: 'grid_view', stage: 'COMPLIANCE_PENDING' },
      {
        label: 'Staff compliance recalculated',
        icon: 'verified_user',
        stage: 'ROTA_REFRESH_PENDING',
      },
      { label: 'Rota training inputs updated', icon: 'event_available', stage: 'COMPLETE_SYNCED' },
    ];
    return [
      {
        label: 'Assessment submitted',
        icon: 'laptop_chromebook',
        at: a?.submittedAt ?? '',
        done: !!a?.submittedAt,
        failed: false,
      },
      {
        label: 'Auto-marked',
        icon: 'settings',
        at: a?.scorerVersion ? a.submittedAt : '',
        done: !!a?.scorerVersion,
        failed: false,
      },
      {
        label: a?.passed ? `Passed (${this.score(a)})` : 'Not passed',
        icon: a?.passed ? 'check_circle' : 'cancel',
        at: a?.submittedAt ?? '',
        done: !!a?.passed,
        failed: !!a && !a.passed,
      },
      ...post.map((s) => ({
        ...s,
        at: this.ack(s.stage)?.at ?? '',
        done: !!this.ack(s.stage),
        failed: false,
      })),
    ];
  }
  protected complete() {
    return (
      !this.certificate()?.revokedAt &&
      this.job()?.status === 'COMPLETE_SYNCED' &&
      this.steps().every((s) => s.done)
    );
  }
  protected elapsed() {
    const end = this.ack('COMPLETE_SYNCED')?.at;
    return end
      ? Math.max(0, Math.ceil((Date.parse(end) - Date.parse(this.result()!.submittedAt)) / 1000))
      : 0;
  }
  protected integrations() {
    return [
      {
        label: 'HR Staff File',
        detail: 'Certificates & records',
        icon: 'folder',
        stage: 'TRAINING_RECORD_PENDING' as const,
      },
      {
        label: 'Training Matrix',
        detail: 'Learner status',
        icon: 'grid_view',
        stage: 'COMPLIANCE_PENDING' as const,
      },
      {
        label: 'Staff Compliance',
        detail: 'Knowledge evidence',
        icon: 'verified_user',
        stage: 'ROTA_REFRESH_PENDING' as const,
      },
      {
        label: 'Rota Eligibility',
        detail: 'Training inputs',
        icon: 'event_available',
        stage: 'COMPLETE_SYNCED' as const,
      },
    ];
  }
  protected retryWorkflow() {
    const job = this.job();
    if (!job) return;
    this.error.set(this.workflow.retry(job.id) ?? '');
    if (!this.error())
      this.notice.set(
        'The saved workflow is queued for retry. Existing acknowledged stages will be retained.',
      );
  }
  protected notify(attempt: AcademyAttempt) {
    this.notice.set('');
    this.error.set(this.academy.notifyRetake(attempt.id, this.workspace) ?? '');
    if (!this.error())
      this.notice.set(
        'Retake notice recorded in the learner portal. External email delivery is not configured.',
      );
  }
  private localTime(instant: number) {
    const d = new Date(instant);
    return (
      londonDate(d) +
      'T' +
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(d)
    );
  }
  protected openSchedule(attempt: AcademyAttempt) {
    if (!this.canSchedule(attempt)) return;
    const minimum = Math.max(
      Date.now() + 300000,
      Date.parse(attempt.submittedAt) + this.policy(attempt).retakeWaitHours * 3600000,
    );
    this.scheduleDate = this.localTime(Math.ceil(minimum / 60000) * 60000);
    const existing = this.plan(attempt);
    if (existing) this.scheduleDate = this.localTime(Date.parse(existing.scheduledFor));
    this.scheduleError.set('');
    this.scheduling.set(attempt);
  }
  @HostListener('window:keydown.escape') protected closeSchedule() {
    this.scheduling.set(null);
  }
  protected saveSchedule() {
    const attempt = this.scheduling();
    if (!attempt) return;
    const [date, time] = this.scheduleDate.split('T'),
      instant = londonInstant(date, time ?? '');
    if (!instant) {
      this.scheduleError.set('Choose a valid, unambiguous UK date and time.');
      return;
    }
    const error = this.academy.scheduleRetake(attempt.id, instant, this.workspace);
    this.scheduleError.set(error ?? '');
    if (!error) {
      this.scheduling.set(null);
      this.notice.set(
        this.academy.state().settings.portalNotifications
          ? 'Retake scheduled and an in-platform learner notice recorded.'
          : 'Retake scheduled. Portal notifications are disabled.',
      );
    }
  }
}
