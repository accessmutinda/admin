import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import { AcademyCourse, AcademyLesson } from './academy.models';
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
  protected readonly showModules = this.route.snapshot.queryParamMap.get('section') === 'modules';
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
      policy: { maxAttempts: 3, retakeWaitHours: 24, timeLimitMinutes: 30, showFeedback: true },
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
  protected readonly audienceBranches = this.academy.api.audience().branches;
  protected readonly audienceRoles = this.academy.api.audience().roles;
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
    this.draft.tags ??= [];
    this.draft.active ??= true;
    this.draft.estimatedMinutes ??= this.minutes() || 45;
    this.draft.practicalRequired ??= ['medication', 'handling'].includes(this.draft.id);
    this.draft.policy ??= {
      maxAttempts: this.academy.state().settings.maxAttempts,
      retakeWaitHours: 24,
      timeLimitMinutes: this.academy.state().settings.timeLimitMinutes,
      showFeedback: true,
    };
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
  protected async save(publish: boolean): Promise<void> {
    this.notice.set('');
    const candidate = {
      ...this.draft,
      status: publish
        ? ('Published' as const)
        : this.draft.status === 'Archived'
          ? ('Archived' as const)
          : ('Draft' as const),
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
      this.notice.set(
        publish
          ? 'Course version published. Existing assignments retain their original version.'
          : 'Draft saved. Published learner content is unchanged.',
      );
    }
  }
  protected async reviewPublish() {
    await this.save(false);
    if (!this.error()) void this.router.navigate(['/manage/learning/publish', this.draft.id]);
  }
  protected isNew() {
    return !this.id;
  }
  protected async saveContinue(): Promise<void> {
    this.notice.set('');
    if (
      !this.draft.title.trim() ||
      !this.draft.code?.trim() ||
      !this.draft.description.trim() ||
      !this.draft.targetRoles?.length ||
      !this.draft.outcomes?.trim()
    ) {
      this.error.set(
        'Enter the course title, code, description, role applicability and at least one learning outcome.',
      );
      return;
    }
    await this.save(false);
    if (!this.error()) void this.router.navigate(['/manage/learning/content', this.draft.id]);
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
  protected saved(): boolean {
    return !!this.academy.course(this.draft.id);
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
