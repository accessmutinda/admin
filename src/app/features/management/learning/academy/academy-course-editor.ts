import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { ErrorStateMatcher } from '@angular/material/core';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import { AcademyCourse, AcademyLesson, authoringPolicy } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.api.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.api.saving()',
  },
  selector: 'cv-academy-course-editor',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
  ],
  templateUrl: './academy-course-editor.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-course-editor.css',
  ],
})
export class AcademyCourseEditor {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly showPublishing =
    this.route.snapshot.queryParamMap.get('section') === 'publishing';
  protected readonly additionalOpen = signal(this.showPublishing);
  protected readonly attemptedContinue = signal(false);
  protected readonly fieldErrorMatcher: ErrorStateMatcher = {
    isErrorState: (control) => this.attemptedContinue() && !!control?.invalid,
  };
  protected hasSavedCourse() {
    return !!this.academy.course(this.draft.id);
  }
  private readonly workspace = this.academy.store.companyId();
  private readonly id = this.route.snapshot.paramMap.get('courseId');
  protected readonly unavailable =
    !!this.academy.api.error() || (!!this.id && !this.academy.course(this.id));
  protected draft: AcademyCourse = structuredClone(
    this.academy.course(this.id ?? '') ?? {
      code: '',
      outcomes: '\n\n',
      tags: [],
      active: true,
      estimatedMinutes: 45,
      targetRoles: [],
      owner: '',
      issuer: '',
      rights: '',
      approver: '',
      effectiveDate: '',
      practicalRequired: false,
      policy: {
        maxAttempts: this.academy.state().settings.maxAttempts,
        retakeWaitHours: 24,
        timeLimitMinutes: this.academy.state().settings.timeLimitMinutes,
        showFeedback: this.academy.state().settings.showFeedback,
        sequentialLessons: this.academy.state().settings.sequentialLessons,
        shuffleQuestions: this.academy.state().settings.shuffleQuestions,
        shuffleOptions: this.academy.state().settings.shuffleOptions,
      },
      id: crypto.randomUUID(),
      title: '',
      description: '',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: null,
      validityMonths: null,
      status: 'Draft',
      sample: false,
      thumbnailId: '',
      lessons: [],
      version: 0,
      updatedAt: '',
    },
  );
  protected readonly audienceBranches = computed(() => this.academy.api.audience().branches);
  protected readonly audienceRoles = computed(() => this.academy.api.audience().roles);
  protected readonly prerequisiteCourses = computed(() => {
    const today = this.academy.api.audience().local_date ?? new Date().toISOString().slice(0, 10);
    return this.academy.api
      .courses()
      .flatMap((record) =>
        record.published && record.course.status !== 'Archived' ? [record.published] : [],
      )
      .filter(
        (course) =>
          course.id !== this.draft.id &&
          course.status === 'Published' &&
          course.active !== false &&
          (!course.effectiveDate || course.effectiveDate <= today),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  });
  protected unavailablePrerequisites(): string[] {
    const live = new Set(this.prerequisiteCourses().map((course) => course.id));
    return (this.draft.prerequisiteCourseIds ?? []).filter((id) => !live.has(id));
  }
  protected prerequisiteTitle(id: string): string {
    const record = this.academy.api.courses().find((record) => record.course.id === id);
    return record?.published?.title ?? record?.course.title ?? 'Unavailable course';
  }
  protected unavailableBranches(): string[] {
    return (this.draft.targetBranches ?? []).filter(
      (branch) => !this.audienceBranches().includes(branch),
    );
  }
  protected readonly postPassActions = [
    {
      title: 'Internal Certificate',
      description: 'Issues a course completion certificate (internal).',
      icon: 'workspace_premium',
    },
    {
      title: 'Staff File',
      description: 'Adds the completion record to the staff member’s HR file.',
      icon: 'folder_open',
    },
    {
      title: 'Training Matrix',
      description: 'Updates the staff training matrix and course currency.',
      icon: 'grid_view',
    },
    {
      title: 'Staff Compliance',
      description: 'Recalculates the staff member’s mandatory training status.',
      icon: 'verified_user',
    },
    {
      title: 'Rota Eligibility',
      description: 'Refreshes relevant training inputs; practical sign-off remains separate.',
      icon: 'event_available',
    },
  ];
  protected readonly lessonTypes = [
    'Video',
    'Reading',
    'Policy acknowledgement',
    'Interactive check',
  ];
  constructor() {
    this.draft.targetRoles ??= [];
    this.draft.targetBranches ??= [];
    this.draft.prerequisiteCourseIds ??= [];
    this.draft.evidenceType ??= 'Internal knowledge completion';
    this.draft.tags ??= [];
    this.draft.active ??= true;
    this.draft.estimatedMinutes ??= this.minutes() || 45;
    this.draft.practicalRequired ??= ['medication', 'handling'].includes(this.draft.id);
    this.draft.policy = authoringPolicy(this.draft.policy, this.academy.state().settings);
    this.original = JSON.stringify(this.draft);
  }
  protected minutes() {
    return this.draft.lessons.reduce((sum, l) => sum + l.minutes, 0);
  }
  protected modules() {
    return (
      this.draft.modules?.length ??
      new Set(this.draft.lessons.map((l) => l.moduleTitle || 'Introduction')).size
    );
  }
  protected prerequisites(index: number) {
    return this.draft.lessons.slice(0, index);
  }
  private original = JSON.stringify(this.draft);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected async save(): Promise<boolean> {
    if (!this.canEdit() || this.academy.api.saving()) return false;
    this.notice.set('');
    this.error.set('');
    const validation = this.validationError();
    if (validation) {
      this.error.set(validation);
      return false;
    }
    const candidate = {
      ...this.draft,
      status: 'Draft' as const,
    };
    const error = await this.academy.persistCourse(
      candidate,
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.draft = structuredClone(this.academy.course(candidate.id)!);
      this.original = JSON.stringify(this.draft);
      this.notice.set('Draft saved. Published learner content is unchanged.');
    }
    return !error;
  }
  private validationError(): string {
    return Object.values(this.validationErrors(false))[0] ?? '';
  }
  protected fieldError(key: string): string {
    return this.attemptedContinue() ? (this.validationErrors(true)[key] ?? '') : '';
  }
  private validationErrors(continuing: boolean): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [key, label] of [
      ['title', 'course title'],
      ['code', 'course code'],
      ['description', 'course description'],
      ['category', 'category'],
    ] as const) {
      if (!this.draft[key]?.trim()) errors[key] = `Enter the ${label}.`;
    }
    if (continuing && !this.draft.targetRoles?.length)
      errors['targetRoles'] = 'Select at least one applicable role group.';
    if (continuing && !this.draft.outcomes?.trim())
      errors['outcomes'] = 'Add at least one learning outcome.';
    if (this.unavailableBranches().length)
      errors['targetBranches'] =
        'Remove unavailable branches and choose active branches from this company.';
    if (this.unavailablePrerequisites().length)
      errors['prerequisiteCourseIds'] =
        'Remove unavailable prerequisites and choose other live courses from this company.';
    const policy = this.draft.policy!;
    for (const [key, label, value, min, max, whole] of [
      ['passMark', 'Pass mark', this.draft.passMark, 1, 100, true],
      ['validityMonths', 'Refresher interval', this.draft.validityMonths, 0, 120, true],
      ['estimatedMinutes', 'Estimated duration', this.draft.estimatedMinutes, 1, 4800, true],
      ['maxAttempts', 'Maximum attempts', policy.maxAttempts, 1, 10, true],
      ['retakeWaitHours', 'Retake waiting period', policy.retakeWaitHours, 0, 720, false],
      ['timeLimitMinutes', 'Assessment time limit', policy.timeLimitMinutes, 0, 240, true],
      ['feedbackDelayHours', 'Feedback delay', policy.feedbackDelayHours, 0, 720, false],
    ] as const) {
      if (value == null && (label === 'Pass mark' || label === 'Refresher interval')) continue;
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (whole && !Number.isInteger(value))
      )
        errors[key] =
          `${label}: enter ${whole ? 'a whole number' : 'a number'} between ${min} and ${max}.`;
    }
    return errors;
  }
  protected isNew() {
    return !this.id;
  }
  protected async saveContinue(): Promise<void> {
    this.attemptedContinue.set(true);
    this.notice.set('');
    const errors = this.validationErrors(true);
    if (Object.keys(errors).length) {
      if (
        [
          'category',
          'targetBranches',
          'prerequisiteCourseIds',
          'maxAttempts',
          'retakeWaitHours',
          'timeLimitMinutes',
          'feedbackDelayHours',
        ].some((key) => errors[key])
      )
        this.additionalOpen.set(true);
      this.error.set(
        `Complete the highlighted fields before continuing. ${Object.values(errors).join(' ')}`,
      );
      return;
    }
    if (await this.save()) void this.router.navigate(['/manage/learning/content', this.draft.id]);
  }
  protected setMandatory(value: boolean) {
    this.draft.mandatory = value;
    if (['Mandatory', 'Optional'].includes(this.draft.category))
      this.draft.category = value ? 'Mandatory' : 'Optional';
  }
  protected removeRole(role: string) {
    this.draft.targetRoles = this.draft.targetRoles?.filter((r) => r !== role);
  }
  protected removeTag(tag: string) {
    this.draft.tags = this.draft.tags?.filter((t) => t !== tag);
  }
  protected tagOptions() {
    return [
      ...new Set([
        'Medication',
        'Clinical Safety',
        'Home Care',
        'Infection Control',
        'Safeguarding',
        'Moving & Handling',
        'Information Governance',
        'Fire Safety',
        ...(this.draft.tags ?? []),
        ...this.academy.state().courses.flatMap((c) => c.tags ?? []),
      ]),
    ];
  }
  protected durationOptions() {
    return [
      ...new Set([15, 30, 45, 60, 90, 120, 180, 240, this.draft.estimatedMinutes ?? 45]),
    ].sort((a, b) => a - b);
  }
  protected passMarkOptions() {
    return [
      ...new Set([
        50,
        60,
        70,
        75,
        80,
        85,
        90,
        95,
        100,
        this.draft.passMark ?? this.academy.state().settings.passMark,
      ]),
    ].sort((a, b) => a - b);
  }
  protected validityOptions() {
    return [
      ...new Set([
        0,
        1,
        3,
        6,
        12,
        18,
        24,
        36,
        this.draft.validityMonths ?? this.academy.state().settings.validityMonths,
      ]),
    ].sort((a, b) => a - b);
  }
  protected passMark() {
    return this.draft.passMark ?? this.academy.state().settings.passMark;
  }
  protected validity() {
    return this.draft.validityMonths ?? this.academy.state().settings.validityMonths;
  }
  protected outcomeRows() {
    return (this.draft.outcomes ?? '').split('\n');
  }
  protected setOutcome(index: number, value: string) {
    const rows = this.outcomeRows();
    rows[index] = value;
    this.draft.outcomes = rows.join('\n');
  }
  protected addOutcome() {
    this.draft.outcomes = this.outcomeRows().concat('').join('\n');
  }
  protected removeOutcome(index: number) {
    const rows = this.outcomeRows();
    rows.splice(index, 1);
    this.draft.outcomes = rows.join('\n');
  }
  protected addLesson(): void {
    this.draft.lessons.push({
      id: crypto.randomUUID(),
      moduleTitle: 'Introduction',
      type: 'Reading',
      mandatory: true,
      prerequisiteIds: [],
      watchThreshold: 90,
      requireResourceAck: true,
      title: '',
      minutes: 10,
      content: '',
      transcript: '',
      videoId: '',
      thumbnailId: '',
      captionId: '',
      handoutIds: [],
    });
  }
  protected move(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0 || target >= this.draft.lessons.length) return;
    const list = this.draft.lessons;
    [list[index], list[target]] = [list[target], list[index]];
  }
  protected remove(lesson: AcademyLesson): void {
    if (window.confirm('Remove this lesson from the course draft?'))
      this.draft.lessons = this.draft.lessons.filter((l) => l.id !== lesson.id);
  }
  protected lessonSaved(id: string): boolean {
    return !!this.academy.course(this.draft.id)?.lessons.some((l) => l.id === id);
  }
  protected canEdit() {
    return (
      this.workspace === this.academy.store.companyId() &&
      this.academy.api.available() &&
      !this.academy.api.error()
    );
  }
  canLeave(): boolean {
    if (!this.canEdit()) return true;
    if (this.academy.api.saving()) return false;
    return (
      JSON.stringify(this.draft) === this.original ||
      window.confirm('Discard unsaved course changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (JSON.stringify(this.draft) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
