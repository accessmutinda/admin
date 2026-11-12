import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { londonDate } from '../../rota/rota.models';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import { AcademyCourse, hasUnusedVideos } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.api.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.api.saving()',
  },
  selector: 'cv-academy-publishing',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
  ],
  templateUrl: './academy-publishing.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-publishing.css'],
})
export class AcademyPublishing {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = this.academy.store.companyId();
  protected course: AcademyCourse | undefined;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly approvedFingerprint = signal('');
  protected readonly selectedVersion = signal<AcademyCourse | null>(null);
  protected readonly lastPublished = signal<number | null>(null);
  private original = '';
  private expected = '';
  private validationCache?: {
    state: unknown;
    input: string;
    context: string;
    error: string | null;
  };
  constructor() {
    this.load(
      this.route.snapshot.paramMap.get('courseId') ??
        this.route.snapshot.queryParamMap.get('course') ??
        this.courses()[0]?.id ??
        '',
    );
  }
  protected courses() {
    return this.academy.editableCourses();
  }
  private load(id: string) {
    this.course = structuredClone(this.academy.course(id));
    this.expected = this.course?.updatedAt ?? '';
    this.original = JSON.stringify(this.course);
    this.approvedFingerprint.set('');
    this.error.set('');
    this.notice.set('');
  }
  protected context() {
    const person = this.route.snapshot.queryParamMap.get('person');
    return person ? { person } : {};
  }
  protected changeCourse(id: string) {
    if (this.canLeave()) {
      if (hasUnusedVideos(this.academy.course(id))) {
        void this.router.navigate(['/manage/learning/structure', id]);
        return;
      }
      this.lastPublished.set(null);
      this.load(id);
    }
  }
  protected reload() {
    if (this.course && this.canLeave()) this.load(this.course.id);
  }
  protected questions() {
    return this.academy
      .state()
      .questions.filter((q) => q.courseId === this.course?.id && q.status === 'Published');
  }
  protected policy() {
    return this.course ? this.academy.policyFor(this.course) : undefined;
  }
  protected minutes() {
    return (
      (this.course?.lessons.reduce((sum, l) => sum + l.minutes, 0) ?? 0) +
      (this.course?.assessmentMinutes ?? 0)
    );
  }
  protected modules() {
    return (
      this.course?.modules?.length ??
      new Set(this.course?.lessons.map((l) => l.moduleTitle || 'Introduction') ?? []).size
    );
  }
  protected media() {
    return [
      ...new Set(
        [
          this.course?.thumbnailId,
          ...(this.course?.lessons.flatMap((l) => [
            l.videoId,
            l.captionId,
            l.thumbnailId,
            ...l.handoutIds,
          ]) ?? []),
        ].filter((id): id is string => !!id),
      ),
    ];
  }
  protected validation() {
    if (!this.course) return 'Choose a saved course to publish.';
    const state = this.academy.state(),
      input = JSON.stringify(this.course),
      context = [
        this.expected,
        this.workspace,
        this.academy.store.companyId(),
        this.academy.canManage(),
      ].join('|');
    if (
      !this.validationCache ||
      this.validationCache.state !== state ||
      this.validationCache.input !== input ||
      this.validationCache.context !== context
    )
      this.validationCache = {
        state,
        input,
        context,
        error: this.academy.publicationError(this.course, this.expected, this.workspace),
      };
    return this.validationCache.error;
  }
  protected checks() {
    if (!this.course) return [];
    const c = this.course,
      questions = this.questions(),
      policy = this.policy()!;
    const checks: {
      title: string;
      icon: string;
      detail: string;
      issues: string[];
      path: string[];
      query?: Record<string, string>;
    }[] = [
      {
        title: 'Course details',
        icon: 'school',
        detail: 'Title, description, learning outcomes and audience',
        path: ['/manage/learning/courses', c.id],
        issues: [
          !c.title.trim() || !c.description.trim()
            ? 'Complete the course title and description.'
            : '',
          !c.sample && (!c.code?.trim() || !c.outcomes?.trim() || !c.targetRoles?.length)
            ? 'Add a unique course code, measurable outcomes and applicable roles.'
            : '',
        ].filter(Boolean),
      },
      {
        title: 'Modules & lessons',
        icon: 'layers',
        detail: `${this.modules()} modules · ${c.lessons.length} lessons · ${this.minutes()} minutes`,
        path: ['/manage/learning/structure', c.id],
        issues: [
          !c.lessons.length ? 'Add at least one lesson.' : '',
          c.lessons.some(
            (l) =>
              !l.title.trim() ||
              !Number.isFinite(l.minutes) ||
              l.minutes < 1 ||
              l.minutes > 480 ||
              (!l.content.trim() && !l.videoId),
          )
            ? 'Complete lesson titles, content and valid durations.'
            : '',
          c.modules?.some((m) => !c.lessons.some((l) => l.moduleId === m.id))
            ? 'Every module needs a lesson.'
            : '',
        ].filter(Boolean),
      },
      {
        title: 'Media & accessibility',
        icon: 'closed_caption',
        detail: 'Referenced media, required readiness, captions and transcripts',
        path: ['/manage/learning/content', c.id],
        issues: [
          this.media().some((id) => !this.academy.state().assets.some((a) => a.id === id))
            ? 'A referenced media asset is missing.'
            : '',
          c.lessons.some((l) => l.videoId && (!l.captionId || !l.transcript.trim()))
            ? 'Every video needs reviewed captions and a transcript.'
            : '',
          c.lessons.some(
            (l) =>
              l.mandatory !== false &&
              [l.videoId, ...l.handoutIds]
                .filter(Boolean)
                .some(
                  (id) => this.academy.state().assets.find((a) => a.id === id)?.status !== 'READY',
                ),
          )
            ? 'Required media must finish processing and accessibility review.'
            : '',
        ].filter(Boolean),
      },
      {
        title: 'Question bank & checkpoints',
        icon: 'quiz',
        detail: `${questions.length} published questions · ${c.questionGroups?.length ?? 0} checkpoint groups`,
        path: ['/manage/learning/questions'],
        query: { course: c.id },
        issues: [
          !questions.some((q) => !q.groupId || q.groupId === 'final')
            ? 'Publish final assessment questions.'
            : '',
          questions.some((q) => !c.lessons.some((l) => l.id === q.lessonId))
            ? 'Reconnect questions to existing course lessons.'
            : '',
          c.questionGroups?.some((g) => !questions.some((q) => q.groupId === g.id))
            ? 'Every configured checkpoint needs published questions.'
            : '',
        ].filter(Boolean),
      },
      {
        title: 'Assessment rules',
        icon: 'fact_check',
        detail: `${c.passMark ?? this.academy.state().settings.passMark}% pass · ${policy.maxAttempts} attempts · ${policy.timeLimitMinutes ? policy.timeLimitMinutes + ' minute timer' : 'Untimed'}`,
        path: ['/manage/learning/rules', c.id],
        issues: [
          !Number.isInteger(policy.maxAttempts) ||
          policy.maxAttempts < 1 ||
          policy.maxAttempts > 10 ||
          !Number.isFinite(policy.retakeWaitHours) ||
          policy.retakeWaitHours < 0 ||
          policy.retakeWaitHours > 720 ||
          !Number.isInteger(policy.timeLimitMinutes) ||
          policy.timeLimitMinutes < 0 ||
          policy.timeLimitMinutes > 240
            ? 'Check the attempt limit, retake wait and timer.'
            : '',
          c.passMark !== null &&
          (!Number.isInteger(c.passMark) || c.passMark < 1 || c.passMark > 100)
            ? 'Set a valid pass threshold.'
            : '',
        ].filter(Boolean),
      },
      {
        title: 'Publication approval',
        icon: 'verified_user',
        detail: c.sample
          ? 'Sample course · internal demonstration content'
          : 'Owner, issuing name, approver, rights and effective date',
        path: ['/manage/learning/courses', c.id],
        query: { section: 'publishing' },
        issues: [
          !c.sample &&
          (!c.owner?.trim() ||
            !c.issuer?.trim() ||
            !c.approver?.trim() ||
            !c.rights?.trim() ||
            !c.effectiveDate)
            ? 'Complete the approval fields below.'
            : '',
        ].filter(Boolean),
      },
    ];
    const error = this.validation();
    checks.push({
      title: 'Final publication validation',
      icon: 'task_alt',
      detail: error
        ? 'Resolve the validation result before publishing'
        : 'The saved course, media, question bank and policy pass validation',
      issues: error ? [error] : [],
      path: ['/manage/learning/courses', c.id],
    });
    return checks;
  }
  protected completedChecks() {
    return this.checks().filter((c) => !c.issues.length).length;
  }
  private fingerprint() {
    return JSON.stringify({
      course: this.course,
      questions: this.questions(),
      assets: this.academy.state().assets.filter((a) => this.media().includes(a.id)),
      settings: this.academy.state().settings,
      latest: this.academy.course(this.course?.id ?? '')?.updatedAt,
    });
  }
  protected attested() {
    return !!this.approvedFingerprint() && this.approvedFingerprint() === this.fingerprint();
  }
  protected attest(value: boolean) {
    this.approvedFingerprint.set(value ? this.fingerprint() : '');
  }
  protected unchangedPublication() {
    if (
      !this.course ||
      this.course.status !== 'Published' ||
      JSON.stringify(this.course) !== this.original ||
      this.academy.state().courseDrafts.some((c) => c.id === this.course?.id)
    )
      return false;
    const published = this.academy
      .state()
      .courses.find((c) => c.id === this.course?.id && c.status === 'Published');
    return (
      !!published &&
      (!published.assessmentQuestions ||
        JSON.stringify(
          [...published.assessmentQuestions].sort((a, b) => a.id.localeCompare(b.id)),
        ) === JSON.stringify([...this.questions()].sort((a, b) => a.id.localeCompare(b.id))))
    );
  }
  protected scheduled() {
    return !!this.course?.effectiveDate && this.course.effectiveDate > londonDate();
  }
  protected versions() {
    const versions = (this.academy.state().courseVersions ?? []).filter(
      (c) => c.id === this.course?.id,
    );
    const current = this.academy
      .state()
      .courses.find((c) => c.id === this.course?.id && c.status === 'Published');
    return [
      ...versions,
      ...(current && !versions.some((c) => c.version === current.version) ? [current] : []),
    ].sort((a, b) => b.version - a.version);
  }
  protected liveVersion() {
    return this.academy
      .state()
      .courses.find((c) => c.id === this.course?.id && c.status === 'Published');
  }
  protected async save(): Promise<boolean> {
    if (!this.course) return false;
    const error = await this.academy.persistCourse(
      { ...this.course, status: 'Draft' },
      this.workspace,
      this.expected,
    );
    this.error.set(error ?? '');
    if (error) return false;
    this.load(this.course.id);
    this.notice.set(
      'Publication draft saved. The existing published version and staff assignments are unchanged.',
    );
    return true;
  }
  protected async back() {
    if (this.course && (JSON.stringify(this.course) === this.original || (await this.save())))
      void this.router.navigate(['/manage/learning/rules', this.course.id], {
        queryParams: this.context(),
      });
  }
  protected async preview() {
    if (this.course && (JSON.stringify(this.course) === this.original || (await this.save())))
      void this.router.navigate(['/staff-portal/training/courses', this.course.id], {
        queryParams: { ...this.context(), preview: '1' },
      });
  }
  protected async publish() {
    if (!this.course) return;
    this.notice.set('');
    if (!this.attested()) {
      this.error.set(
        'Confirm that the current course content and publication details have been reviewed.',
      );
      return;
    }
    if (this.unchangedPublication()) {
      this.error.set(
        'This version is already published. Save or edit a draft to publish a new version.',
      );
      return;
    }
    const error = await this.academy.persistCourse(
      { ...this.course, status: 'Published' },
      this.workspace,
      this.expected,
    );
    this.error.set(error ?? '');
    if (!error) {
      const id = this.course.id;
      this.load(id);
      this.lastPublished.set(this.course!.version);
      this.notice.set(
        this.course?.active === false
          ? 'Course version published as inactive. New assignments and optional enrolment remain unavailable.'
          : this.scheduled()
            ? 'Course version published. New assignments and optional enrolment open on its effective date.'
            : 'Course version published and available for new assignments. Existing learner snapshots remain unchanged.',
      );
    }
  }
  protected canEdit() {
    return (
      this.workspace === this.academy.store.companyId() &&
      this.academy.api.available() &&
      !this.academy.api.error()
    );
  }
  canLeave() {
    if (!this.canEdit()) return true;
    if (this.academy.api.saving()) return false;
    return (
      JSON.stringify(this.course) === this.original ||
      window.confirm('Discard unsaved publication details?')
    );
  }
  @HostListener('window:keydown.escape') protected escape() {
    this.selectedVersion.set(null);
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (JSON.stringify(this.course) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
