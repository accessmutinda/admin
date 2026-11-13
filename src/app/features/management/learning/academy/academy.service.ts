import { AcademyMyCoursesApi } from './academy-my-courses-api.service';
import { ACADEMY_LEARNER_ONLY } from './academy-learner-context';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyAssignmentsApi } from './academy-assignments-api.service';
import { AcademyApi } from './academy-api.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import {
  AcademyCapability,
  requirementsFor,
  evidenceCurrent,
  courseApplies,
  emptyGovernance,
} from './academy-governance.models';
import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { ROLES } from '../../../../core/auth/models/role';
import { ManagementStore } from '../../shared/management.store';
import { validDate } from '../../care/care.models';
import { londonDate } from '../../rota/rota.models';
import {
  AcademyData,
  AcademyRetakePlan,
  courseMediaLessons,
  hasUnusedVideos,
  AcademyPolicy,
  AcademySettings,
  AcademyCourse,
  AcademyQuestion,
  AcademyQuestionGroup,
  AcademyAssignmentOptions,
  AcademyAssignmentPlan,
  AcademyAssignment,
  AcademyAttempt,
  AcademyAsset,
  AcademyCertificate,
  emptyAcademy,
  legacyAssignment,
  gradeAttempt,
  questionCorrect,
  shuffled,
  addMonths,
  assignmentStatus,
} from './academy.models';

@Injectable({ providedIn: 'root' })
export class AcademyService {
  readonly myCoursesApi = inject(AcademyMyCoursesApi);
  readonly learnerOnly = inject(ACADEMY_LEARNER_ONLY, { optional: true }) === true;
  private readonly access = inject(CompanyAccessService);
  readonly store = inject(ManagementStore);
  readonly api = inject(AcademyApi);
  readonly assignmentApi = inject(AcademyAssignmentsApi);
  readonly resultsApi = inject(AcademyResultsApi);
  readonly certificatesApi = inject(AcademyCertificatesApi);
  readonly governanceApi = inject(AcademyGovernanceApi);
  readonly auth = inject(AuthService);
  readonly state = computed<AcademyData>(() => {
    const records = this.api.courses();
    const courses = new Map(
      records
        .flatMap((r) =>
          r.published ? [r.published] : r.course.status !== 'Draft' ? [r.course] : [],
        )
        .map((c) => [c.id, c]),
    );
    if (this.learnerOnly) for (const c of this.myCoursesApi.courses()) courses.set(c.id, c);
    for (const a of [...this.resultsApi.assignments()]
      .filter((a) => !a.archived)
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))) {
      if (a.courseSnapshot && !courses.has(a.courseId)) courses.set(a.courseId, a.courseSnapshot);
    }
    return {
      ...emptyAcademy(),
      settings: {
        ...emptyAcademy().settings,
        ...this.api.settings(),
        ...(this.learnerOnly
          ? { allowSelfEnrolment: this.myCoursesApi.snapshot()?.allow_self_enrolment ?? false }
          : {}),
        dueSoonDays:
          this.assignmentApi.dueSoonDays() ??
          this.resultsApi.dueSoonDays() ??
          this.api.settings().dueSoonDays ??
          emptyAcademy().settings.dueSoonDays,
      },
      courses: [...courses.values()],
      courseDrafts: records.filter((r) => r.course.status === 'Draft').map((r) => r.course),
      questions: records.flatMap((r) => r.questions.filter((q) => q.status !== 'Draft')),
      questionDrafts: records.flatMap((r) => r.questions.filter((q) => q.status === 'Draft')),
      courseVersions: records.flatMap((r) => r.versions),
      assets: [
        ...this.api.assets(),
        ...(this.learnerOnly ? this.myCoursesApi.assets() : []),
        ...this.resultsApi.assets().filter((a) => !this.api.assets().some((v) => v.id === a.id)),
      ],
      assignments: this.assignments(),
      attempts: this.resultsApi.attempts(),
      retakePlans: this.resultsApi.retakes(),
      certificates: this.certificatesApi.certificates(),
      completions: this.certificatesApi.completions(),
      refresherSchedules: this.certificatesApi.refreshers(),
      accessRequests: this.certificatesApi.requests(),
      notices: this.governanceApi.notifications().map((n) => ({ ...n, key: n.id })),
      governance: {
        ...this.governanceApi.data(),
        requirements: this.certificatesApi.requirements(),
      },
    };
  });
  async persistCourse(
    course: AcademyCourse,
    workspace: string,
    expected = '',
  ): Promise<string | null> {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen this course.';
    try {
      const record = await this.api.save(course, expected);
      course.id = record.course.id;
      return null;
    } catch (e) {
      const error = e as Error & { fieldErrors?: Record<string, string[]> };
      const fields = Object.entries(error.fieldErrors ?? {})
        .map(([field, values]) => `${field}: ${values.join(' ')}`)
        .join(' ');
      return fields || error.message;
    }
  }
  async persistQuestionBank(
    courseId: string,
    questions: AcademyQuestion[],
    groups: AcademyQuestionGroup[],
    expected: string,
    workspace: string,
    publishQuestionId?: string,
  ): Promise<string | null> {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen this course.';
    try {
      await this.api.bank(courseId, questions, groups, expected, publishQuestionId);
      return null;
    } catch (e) {
      const error = e as Error & { fieldErrors?: Record<string, string[]> };
      const fields = Object.entries(error.fieldErrors ?? {})
        .map(([field, values]) => `${field}: ${values.join(' ')}`)
        .join(' ');
      return fields || error.message;
    }
  }
  readonly editableCourses = computed(() => [
    ...this.state().courseDrafts,
    ...this.state().courses.filter((c) => !this.state().courseDrafts.some((d) => d.id === c.id)),
  ]);
  readonly editableQuestions = computed(() => [
    ...this.state().questionDrafts,
    ...this.state().questions.filter(
      (q) => !this.state().questionDrafts.some((d) => d.id === q.id),
    ),
  ]);
  readonly enabled = computed(() => this.access.can('academy'));
  readonly canManage = computed(() =>
    (['author', 'publish', 'assign', 'review', 'correct', 'configure'] as AcademyCapability[]).some(
      (cap) => this.can(cap),
    ),
  );
  readonly canViewEvidence = computed(
    () =>
      !this.learnerOnly &&
      (this.access.can('academy', 'results') || this.access.can('academy', 'certificates')),
  );
  can(capability: AcademyCapability, personId = ''): boolean {
    if (
      this.learnerOnly &&
      [
        'author',
        'publish',
        'assign',
        'review',
        'correct',
        'configure',
        'diagnostics',
        'evidence',
      ].includes(capability)
    )
      return false;
    const features: Record<string, string> = {
      author: 'courses',
      publish: 'governance',
      assign: 'assignments',
      review: 'results',
      correct: 'results',
      configure: 'governance',
      export: 'reports',
      evidence: 'results',
      diagnostics: 'governance',
    };
    return this.access.can('academy', features[capability] ?? 'learner', capability);
  }
  feedbackVisible(attempt: AcademyAttempt): boolean {
    if ('feedbackPermitted' in attempt) return !!attempt.feedbackPermitted;
    if (this.can('author') || this.can('review', attempt.personId)) return true;
    return (
      !!attempt.submittedAt &&
      attempt.showFeedback &&
      !attempt.invalidatedAt &&
      (attempt.policy?.feedbackMode !== 'Manager release' || !!attempt.feedbackReleasedAt) &&
      (!attempt.feedbackAvailableAt || Date.parse(attempt.feedbackAvailableAt) <= Date.now())
    );
  }
  readonly me = computed(() => this.resultsApi.me());
  readonly assignments = computed(() => {
    const rows = new Map(this.assignmentApi.assignments().map((a) => [a.id, a]));
    this.resultsApi.assignments().forEach((a) => rows.set(a.id, a));
    return [...rows.values()];
  });
  owns(personId: string): boolean {
    return this.enabled() && this.me()?.id === personId;
  }
  canReadPerson(personId: string): boolean {
    return (
      this.enabled() &&
      (this.can('evidence', personId) ||
        this.owns(personId) ||
        this.certificatesApi.people().some((p) => p.id === personId))
    );
  }
  canBrowseCourse(course: AcademyCourse): boolean {
    if (!this.enabled()) return false;
    if (this.canManage()) return true;
    const person = this.me();
    if (!person) return false;
    if (
      this.assignments().some(
        (a) => a.personId === person.id && a.courseId === course.id && !a.archived,
      )
    )
      return true;
    if (this.learnerOnly) return this.myCoursesApi.courses().some((c) => c.id === course.id);
    if (course.targetBranches?.length && !course.targetBranches.includes(person.location))
      return false;
    return (
      course.status === 'Published' &&
      course.active !== false &&
      this.state().settings.allowSelfEnrolment &&
      !course.mandatory &&
      (!course.effectiveDate || course.effectiveDate <= londonDate()) &&
      (!course.targetRoles?.length || course.targetRoles.includes(person.role))
    );
  }
  course(id: string): AcademyCourse | undefined {
    const course = (
      this.canManage()
        ? this.editableCourses()
        : this.state().courses.filter((c) => c.status === 'Published')
    ).find((c) => c.id === id);
    if (!course || !this.canBrowseCourse(course)) return undefined;
    if (this.canManage()) return course;
    const { assessmentQuestions, assignmentPlan, ...learnerCourse } = course;
    return learnerCourse;
  }
  assignment(id: string) {
    return this.assignments().find(
      (a) => a.id === id && !a.archived && this.canReadPerson(a.personId),
    );
  }
  attempt(id: string) {
    const attempt = this.state().attempts.find(
      (a) => a.id === id && this.canReadPerson(a.personId),
    );
    if (!attempt || this.feedbackVisible(attempt)) return attempt;
    return {
      ...attempt,
      questions: attempt.questions.map((q) => ({
        ...q,
        correctIds: [],
        explanation: '',
        correctFeedback: '',
        incorrectFeedback: '',
      })),
    };
  }
  assignedCourse(assignment: AcademyAssignment): AcademyCourse | undefined {
    const course =
      assignment.courseSnapshot ?? this.state().courses.find((c) => c.id === assignment.courseId);
    if (!course || this.can('author')) return course;
    const { assessmentQuestions, assignmentPlan, ...learnerCourse } = course;
    return learnerCourse;
  }
  completion(assignmentId: string) {
    const c = this.state()
      .certificates.filter(
        (c) => c.assignmentId === assignmentId && !c.revokedAt && !c.replacedById,
      )
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.id.localeCompare(a.id))[0];
    return this.state().completions?.find(
      (j) =>
        j.assignmentId === assignmentId &&
        this.canReadPerson(j.personId) &&
        (c?.replacesId ? j.certificateId === c.id : !j.certificateId || j.certificateId === c?.id),
    );
  }
  canReadCertificate(): boolean {
    return this.certificatesApi.available() || this.certificatesApi.learnerAvailable();
  }
  certificate(id: string) {
    return this.state().certificates.find((c) => c.id === id && this.canReadCertificate());
  }
  policyFor(course: AcademyCourse, settings = this.state().settings): AcademyPolicy {
    return {
      maxAttempts: settings.maxAttempts,
      retakeWaitHours: 0,
      timeLimitMinutes: settings.timeLimitMinutes,
      showFeedback: settings.showFeedback,
      sequentialLessons: settings.sequentialLessons,
      shuffleQuestions: settings.shuffleQuestions,
      shuffleOptions: settings.shuffleOptions,
      ...course.policy,
    };
  }
  private snapshotCourse(course: AcademyCourse, settings: AcademySettings): AcademyCourse {
    const { assignmentPlan, pendingLessons, ...content } = course;
    return structuredClone({
      ...content,
      passMark: course.passMark ?? settings.passMark,
      validityMonths: course.validityMonths ?? settings.validityMonths,
      policy: this.policyFor(course, settings),
    });
  }
  lessonBlock(a: AcademyAssignment, lessonId: string): string {
    const course = this.assignedCourse(a);
    const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
    if (!course || index < 0) return 'Lesson is unavailable.';
    const person = this.store.staff().find((p) => p.id === a.personId);
    if (
      course.prerequisiteCourseIds?.some(
        (id) => !person || !evidenceCurrent(this.state(), person, id),
      )
    )
      return 'Complete prerequisite courses with current evidence first.';
    if (
      (a.policySnapshot?.sequentialLessons ??
        course.policy?.sequentialLessons ??
        this.state().settings.sequentialLessons) &&
      course.lessons
        .slice(0, index)
        .some((l) => l.mandatory !== false && !a.completedLessonIds.includes(l.id))
    )
      return 'Complete the earlier lessons first.';
    const module = course.modules?.find((m) => m.id === course.lessons[index].moduleId);
    if (
      module?.prerequisiteModuleIds?.some((id) =>
        course.lessons.some(
          (l) => l.moduleId === id && l.mandatory !== false && !a.completedLessonIds.includes(l.id),
        ),
      )
    )
      return 'Complete prerequisite modules first.';
    for (const group of course.questionGroups ?? []) {
      if (!group.required || this.groupPassed(a.id, group.id)) continue;
      const target = course.modules?.findIndex((m) => m.id === group.moduleId) ?? -1;
      const current =
        course.modules?.findIndex((m) => m.id === course.lessons[index].moduleId) ?? -1;
      const lessonIndex = course.lessons.findIndex((l) => l.id === group.lessonId);
      if (
        (group.placement === 'Before module' && current >= target && target >= 0) ||
        (group.placement === 'After module' && current > target && target >= 0) ||
        (['After lesson', 'Within module'].includes(group.placement) &&
          index > lessonIndex &&
          lessonIndex >= 0)
      )
        return (
          (group.kind === 'Survey'
            ? 'Complete the required survey: '
            : 'Pass the required question group: ') +
          group.title +
          '.'
        );
    }
    if (course.lessons[index].prerequisiteIds?.some((id) => !a.completedLessonIds.includes(id)))
      return 'Complete prerequisite lessons first.';
    return '';
  }
  groupPassed(assignmentId: string, groupId: string) {
    return this.state().attempts.some(
      (a) =>
        a.assignmentId === assignmentId &&
        (a.groupId ?? '') === groupId &&
        !!a.submittedAt &&
        !a.invalidatedAt &&
        a.passed,
    );
  }
  private latestGroupAttempt(attempts: AcademyAttempt[], assignmentId: string, groupId: string) {
    return attempts
      .filter(
        (a) =>
          a.assignmentId === assignmentId &&
          a.groupId === groupId &&
          a.submittedAt &&
          !a.invalidatedAt,
      )
      .reverse()
      .sort(
        (a, b) =>
          b.submittedAt.localeCompare(a.submittedAt) || b.startedAt.localeCompare(a.startedAt),
      )[0];
  }
  assessmentAvailability(a: AcademyAssignment, now = Date.now(), groupId = '') {
    const server = this.resultsApi.assignments().find((v) => v.id === a.id)?.availability[
      groupId === 'final' ? '' : groupId
    ];
    if (server) {
      const ready = server.readyAt && Date.parse(server.readyAt) <= now;
      return {
        ...server,
        ...(ready &&
        server.reason === 'Retake waiting period or scheduled time has not been reached.'
          ? { readyAt: '', reason: '' }
          : {}),
      };
    }
    groupId = groupId === 'final' ? '' : groupId;
    const course = this.assignedCourse(a);
    const group = course?.questionGroups?.find((g) => g.id === groupId);
    const person = this.store.staff().find((p) => p.id === a.personId);
    const missingPrerequisite = course?.prerequisiteCourseIds?.some(
      (id) => !person || !evidenceCurrent(this.state(), person, id),
    );
    const history = this.state().attempts.filter(
      (v) => v.assignmentId === a.id && (v.groupId ?? '') === groupId,
    );
    const policy = a.policySnapshot ?? (course ? this.policyFor(course) : undefined);
    const remaining = Math.max(0, (policy?.maxAttempts ?? 0) - history.length);
    const base = {
      remaining,
      readyAt: '',
      runningId: '',
      availableAt: '',
      dueAt: '',
      overdue: false,
    };
    if (missingPrerequisite)
      return { ...base, reason: 'Complete the prerequisite courses with current evidence first.' };
    if (!course || (groupId && !group))
      return { ...base, reason: 'Assessment group is unavailable.' };
    if (a.archived || a.completedAt)
      return {
        ...base,
        reason: 'This learning cycle is complete. Ask your manager for a refresher.',
      };
    if (groupId && this.groupPassed(a.id, groupId))
      return {
        ...base,
        reason: group?.kind === 'Survey' ? 'Survey completed.' : 'Question group passed.',
      };
    const questions =
      a.questionSnapshot ??
      course.assessmentQuestions ??
      this.state().questions.filter((q) => q.courseId === course.id && q.status === 'Published');
    if (!questions.some((q) => (q.groupId === 'final' ? '' : (q.groupId ?? '')) === groupId))
      return { ...base, reason: 'No published questions are available for this assessment.' };
    const running = history.find((v) => !v.submittedAt);

    const assigned = Date.parse(a.assignedAt);
    const available =
      group && Number.isFinite(assigned) ? assigned + group.availableAfterDays * 86400000 : 0;
    const due =
      group && group.dueAfterDays !== null && Number.isFinite(assigned)
        ? assigned + group.dueAfterDays * 86400000
        : 0;
    const schedule = {
      ...base,
      availableAt: available ? new Date(available).toISOString() : '',
      dueAt: due ? new Date(due).toISOString() : '',
      overdue: !!due && due < now,
    };
    if (running) return { ...schedule, reason: '', runningId: running.id };
    if (available > now)
      return { ...schedule, reason: 'Question group opens on its scheduled date.' };
    let required = course.lessons;
    if (group?.placement === 'Before module' || group?.placement === 'After module') {
      const moduleIndex = course.modules!.findIndex((m) => m.id === group.moduleId);
      const ids = course
        .modules!.slice(0, moduleIndex + (group.placement === 'After module' ? 1 : 0))
        .map((m) => m.id);
      required = course.lessons.filter((l) => ids.includes(l.moduleId ?? ''));
    } else if (group && ['After lesson', 'Within module'].includes(group.placement))
      required = course.lessons.slice(
        0,
        course.lessons.findIndex((l) => l.id === group.lessonId) + 1,
      );
    else if (group?.placement === 'Scheduled') required = [];
    if (required.some((l) => l.mandatory !== false && !a.completedLessonIds.includes(l.id)))
      return {
        ...schedule,
        reason: group
          ? 'Complete the required lessons before this checkpoint.'
          : 'Complete all required lessons to unlock the assessment.',
      };
    if (!group && course.questionGroups?.some((g) => g.required && !this.groupPassed(a.id, g.id)))
      return {
        ...schedule,
        reason: 'Pass all required question groups before the final assessment.',
      };
    if (
      !group &&
      course.questionGroups?.some(
        (g) =>
          g.kind !== 'Survey' &&
          g.countsTowardGrade &&
          !this.latestGroupAttempt(this.state().attempts, a.id, g.id),
      )
    )
      return {
        ...schedule,
        reason:
          'Complete all quizzes that count toward the final grade before the final assessment.',
      };
    if (!remaining)
      return { ...schedule, reason: 'No attempts remain. Training manager review is required.' };
    const latest = history
      .filter((v) => v.submittedAt)
      .reverse()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    const minimum = latest
      ? Date.parse(latest.submittedAt) + (policy?.retakeWaitHours ?? 0) * 3600000
      : 0;
    const plan = this.state().retakePlans?.find(
      (p) =>
        p.assignmentId === a.id &&
        p.groupId === groupId &&
        p.fromAttemptId === latest?.id &&
        !p.startedAttemptId,
    );
    const next = Math.max(minimum, Date.parse(plan?.scheduledFor ?? '') || 0);
    return {
      ...schedule,
      reason:
        next > now
          ? plan && Date.parse(plan.scheduledFor) > minimum
            ? 'Retake scheduled for a later date.'
            : 'Retake waiting period is in progress.'
          : '',
      readyAt: next > now ? new Date(next).toISOString() : '',
    };
  }
  watchedPercent(a: AcademyAssignment, lessonId: string): number {
    const duration = a.videoDurations?.[lessonId] ?? 0;
    const watched = (a.watchedRanges?.[lessonId] ?? []).reduce(
      (sum, [start, end]) => sum + end - start,
      0,
    );
    return duration > 0 ? Math.min(100, Math.floor((watched / duration) * 100)) : 0;
  }
  recordVideoProgress(
    assignmentId: string,
    lessonId: string,
    start: number,
    end: number,
    duration: number,
    elapsedSeconds: number,
    workspace: string,
  ): string | null {
    return 'Verified video viewing evidence is not available for this lesson yet.';
  }
  async requestTrainingRecords(workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.certificatesApi.requestRecords());
  }
  async acknowledgeRecordsRequest(id: string, workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.certificatesApi.acknowledge(id));
  }
  knowledgeCompliance(personId: string) {
    const source = this.certificatesApi.compliance().find((r) => r.person.id === personId);
    return {
      required: source?.requirements.length ?? 0,
      missing: (source?.requirements ?? [])
        .filter((r) => r.missing)
        .map((r) => ({ id: r.courseId, title: r.title })),
      compliant: source?.compliant ?? null,
      percent: source?.percentage ?? null,
    };
  }
  practicalReadiness(personId: string, courseId: string) {
    const course = this.state().courses.find((c) => c.id === courseId);
    if (!course?.practicalRequired && !['medication', 'handling'].includes(courseId))
      return 'Not required by this course policy';
    const record = this.store
      .staff()
      .find((p) => p.id === personId)
      ?.hr?.training.find((t) => t.courseId === courseId);
    if (record?.competency !== 'Competent' || !record.assessor.trim())
      return 'Separate practical sign-off required';
    if (record.practicalReviewDue && record.practicalReviewDue < londonDate())
      return 'Practical review overdue';
    return 'Practical sign-off recorded; visit-specific restrictions still apply';
  }
  saveMediaMetadata(
    id: string,
    metadata: {
      rights: string;
      language: string;
      replacesId?: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
    },
    workspace: string,
  ) {
    return this.change(workspace, 'Media metadata saved', id, (d) => {
      const a = d.assets.find((a) => a.id === id);
      if (!a) return 'Media unavailable.';
      if (
        !metadata.rights.trim() ||
        !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(metadata.language) ||
        (metadata.durationSeconds !== undefined &&
          (!Number.isFinite(metadata.durationSeconds) || metadata.durationSeconds <= 0))
      )
        return 'Record media rights, a language code and valid duration.';
      if (metadata.replacesId) {
        const previous = d.assets.find((x) => x.id === metadata.replacesId);
        if (!previous || previous.id === id || previous.kind !== a.kind)
          return 'Choose a different earlier asset of the same kind.';
        let ancestor = previous;
        const seen = new Set([id]);
        while (ancestor) {
          if (seen.has(ancestor.id)) return 'Asset versions cannot contain a cycle.';
          seen.add(ancestor.id);
          const parent = d.assets.find((x) => x.id === ancestor.replacesId);
          if (!parent) break;
          ancestor = parent;
        }
        a.version = (previous.version ?? 1) + 1;
      }
      Object.assign(a, metadata);
      a.version ??= 1;
      return null;
    });
  }
  simulateMediaCheck(id: string, reject: boolean, workspace: string) {
    return this.change(
      workspace,
      reject ? 'Media quarantine simulated' : 'Media retry simulated',
      id,
      (d) => {
        const asset = d.assets.find((a) => a.id === id);
        if (!asset) return 'Media unavailable.';
        asset.status = reject ? 'FAILED' : asset.kind === 'Video' ? 'CAPTIONS_REVIEW' : 'READY';
        asset.failure = reject
          ? 'Simulated malware/content scan rejection — demonstration only'
          : '';
        if (!reject && asset.kind === 'Video') asset.accessibilityReview = undefined;
        return null;
      },
    );
  }
  processDemoAsset(id: string, workspace: string): string | null {
    return this.change(workspace, 'Demo media checks completed', id, (d) => {
      const asset = d.assets.find((a) => a.id === id);
      if (!asset) return 'Asset unavailable.';
      asset.status = asset.kind === 'Video' ? 'CAPTIONS_REVIEW' : 'READY';
      return null;
    });
  }
  approveDemoVideo(courseId: string, lessonId: string, workspace: string): string | null {
    return this.change(workspace, 'Video accessibility review approved', lessonId, (d) => {
      const course =
        d.courseDrafts.find((c) => c.id === courseId) ?? d.courses.find((c) => c.id === courseId);
      const lesson = courseMediaLessons(course).find((l) => l.id === lessonId);
      if (!lesson?.videoId || !lesson.captionId || !lesson.transcript.trim())
        return 'Save a video, captions and transcript before approving accessibility.';
      const asset = d.assets.find((a) => a.id === lesson.videoId);
      if (!asset || asset.status === 'FAILED') return 'The video is missing or failed file checks.';
      asset.status = 'READY';
      asset.accessibilityReview = {
        by: this.auth.currentUser()!.name,
        at: new Date().toISOString(),
        note: 'Captions, transcript and accessibility reviewed',
      };
      return null;
    });
  }
  status(a: AcademyAssignment) {
    if (
      !a.completedAt &&
      this.state().attempts.some((t) => t.assignmentId === a.id && !t.groupId && t.invalidatedAt)
    )
      return 'Evidence review';
    const certificate =
      this.state()
        .certificates.filter((c) => c.assignmentId === a.id && !c.revokedAt && !c.replacedById)
        .sort((x, y) => y.issuedAt.localeCompare(x.issuedAt) || y.id.localeCompare(x.id))[0] ??
      this.state().certificates.find((c) => c.assignmentId === a.id);
    if (certificate?.revokedAt) return 'Evidence review';
    if (a.completedAt && certificate?.expires) {
      if (certificate.expires < londonDate()) return 'Expired';
      if (
        certificate.expires <=
        new Date(Date.now() + this.state().settings.dueSoonDays * 86400000)
          .toISOString()
          .slice(0, 10)
      )
        return 'Expiring soon';
    }
    if (
      a.completedAt &&
      this.assignedCourse(a)?.evidenceType &&
      this.assignedCourse(a)?.evidenceType !== 'Internal knowledge completion'
    )
      return 'Evidence review';
    if (
      a.completedAt &&
      !(
        certificate?.documentId &&
        this.completion(a.id)?.acknowledgements.some((e) => e.stage === 'TRAINING_RECORD_PENDING')
      )
    )
      return 'Passed · evidence pending';
    return assignmentStatus(a, this.state().settings.dueSoonDays);
  }
  private change(
    workspace: string,
    action: string,
    detail: string,
    apply: (draft: AcademyData) => string | null,
    personId = '',
    admin = true,
  ): string | null {
    if (workspace !== this.store.companyId())
      return 'The workspace changed. Reopen this page before saving.';
    if (!this.enabled() || (!admin && !this.owns(personId)))
      return 'You do not have permission for this action.';
    if (admin) {
      const capability: AcademyCapability = /report prepared/i.test(action)
        ? 'export'
        : /revok|correct|invalidat/i.test(action)
          ? 'correct'
          : /settings|rules|access grant/i.test(action)
            ? 'configure'
            : /publish/i.test(action)
              ? 'publish'
              : /assign|reminder|retake/i.test(action)
                ? 'assign'
                : /request acknowledged/i.test(action)
                  ? 'review'
                  : 'author';
      if (!this.can(capability, personId))
        return 'Your role does not have permission for this Academy action.';
    }
    const previous = this.assignments();
    const draft = structuredClone({ ...this.state(), assignments: previous });
    const error = apply(draft);
    if (error) return error;
    if (draft.governance?.offline && !admin) {
      draft.governance.syncQueue ??= [];
      draft.governance.syncQueue.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        personId,
        action,
        status: 'Pending',
        reconciledAt: '',
      });
    }
    if (draft.governance)
      for (const notice of draft.notices.filter(
        (n) => !this.state().notices.some((old) => old.id === n.id),
      )) {
        const id = 'notice:' + notice.id;
        if (!draft.governance.deliveries.some((n) => n.id === id))
          draft.governance.deliveries.push({
            id,
            personId: notice.personId,
            assignmentId: notice.assignmentId,
            channel: 'In-platform',
            title: notice.title,
            text: notice.text,
            status: 'Queued',
            attempts: 0,
            nextAttemptAt: '',
            updatedAt: new Date().toISOString(),
            providerId: '',
            error: '',
            history: [
              {
                at: new Date().toISOString(),
                status: 'Queued',
                detail: 'Local portal notice queued',
              },
            ],
          });
      }
    if (action !== 'Lesson progress saved')
      draft.events.unshift({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actor: this.auth.currentUser()!.name,
        action,
        detail,
        personId,
      });
    const saved = this.store.saveWorkspace((data) => {
      const next = { ...data, academy: draft };
      next.people = data.people.map((p) => {
        if (
          p.hr?.training.some(
            (t) =>
              t.evidenceStatus !== 'Revoked' &&
              draft.certificates.some((c) => c.id === t.certificateId && c.revokedAt),
          )
        )
          p = {
            ...p,
            hr: {
              ...p.hr,
              training: p.hr.training.map((t) =>
                draft.certificates.some((c) => c.id === t.certificateId && c.revokedAt)
                  ? { ...t, evidenceStatus: 'Revoked' as const }
                  : t,
              ),
            },
          };
        const assignments = draft.assignments.filter((a) => {
          if (a.personId !== p.id || a.archived) return false;
          const old = previous.find((v) => v.id === a.id);
          return (
            !old ||
            old.completedAt !== a.completedAt ||
            JSON.stringify(old.completedLessonIds) !== JSON.stringify(a.completedLessonIds)
          );
        });
        if (!assignments.length) return p;
        return {
          ...p,
          learning: [...new Set([...p.learning, ...assignments.map((a) => a.courseId)])],
          progress: {
            ...p.progress,
            ...Object.fromEntries(
              assignments.map((a) => {
                const count = draft.courses.find((c) => c.id === a.courseId)?.lessons.length ?? 0;
                return [
                  a.courseId,
                  a.completedAt
                    ? 100
                    : count
                      ? Math.min(90, Math.round((a.completedLessonIds.length / count) * 90))
                      : 0,
                ];
              }),
            ),
          },
        };
      });
      return next;
    });
    return saved
      ? null
      : 'Could not save on this device. Free browser storage and retry. Your draft is retained.';
  }
  saveSettings(_settings: AcademySettings, _workspace: string, _expected: string): string {
    return 'Use the server-backed academy settings form to save settings.';
  }
  private pinAssignments(d: AcademyData, courseId: string): void {
    const published = d.courses.find((c) => c.id === courseId);
    if (!published) return;
    const questions =
      published.assessmentQuestions ??
      d.questions.filter((q) => q.courseId === courseId && q.status === 'Published');
    for (const a of d.assignments.filter((a) => a.courseId === courseId && !a.courseSnapshot)) {
      a.tenantId = this.store.companyId();
      a.courseVersion = published.version;
      a.courseSnapshot = this.snapshotCourse(published, d.settings);
      a.questionSnapshot = structuredClone(questions);
      a.policySnapshot = this.policyFor(published, d.settings);
    }
  }
  private groupValidation(course: AcademyCourse): string | null {
    const groups = course.questionGroups ?? [];
    if (
      new Set(groups.map((g) => g.id)).size !== groups.length ||
      new Set(groups.map((g) => g.title.trim().toLowerCase())).size !== groups.length ||
      groups.some(
        (g) =>
          !g.id ||
          g.id === 'final' ||
          !g.title.trim() ||
          g.title.length > 100 ||
          ![
            'Course completion',
            'Before module',
            'After module',
            'Within module',
            'After lesson',
            'Scheduled',
          ].includes(g.placement) ||
          !Number.isInteger(g.availableAfterDays) ||
          g.availableAfterDays < 0 ||
          g.availableAfterDays > 3650 ||
          (g.dueAfterDays !== null &&
            (!Number.isInteger(g.dueAfterDays) ||
              g.dueAfterDays < g.availableAfterDays ||
              g.dueAfterDays > 3650)) ||
          (['Before module', 'After module'].includes(g.placement) &&
            !course.modules?.some((m) => m.id === g.moduleId)) ||
          (g.kind !== undefined && !['Quiz', 'Survey'].includes(g.kind)) ||
          (g.countsTowardGrade !== undefined && typeof g.countsTowardGrade !== 'boolean') ||
          (g.kind === 'Survey' && !!g.countsTowardGrade) ||
          (g.placement === 'Within module' &&
            !course.lessons.some((l) => l.id === g.lessonId && l.moduleId === g.moduleId)) ||
          (g.placement === 'After lesson' && !course.lessons.some((l) => l.id === g.lessonId)),
      )
    )
      return 'Check unique question group names, module/lesson placement and schedule days (0–3650); due day must follow availability. Surveys cannot count toward the grade.';
    return null;
  }
  saveCourse(course: AcademyCourse, workspace: string, expected = ''): string | null {
    return this.change(workspace, 'Course saved', course.id + ' · ' + course.title, (d) =>
      this.applyCourse(d, course, expected),
    );
  }
  publicationError(course: AcademyCourse, expected: string, workspace: string): string | null {
    if (workspace !== this.store.companyId())
      return 'The workspace changed. Reopen the publishing page.';
    if (!this.canManage()) return 'You do not have permission to publish courses.';
    return this.applyCourse(
      structuredClone(this.state()),
      { ...structuredClone(course), status: 'Published' },
      expected,
    );
  }
  private applyCourse(d: AcademyData, course: AcademyCourse, expected: string): string | null {
    const old =
      d.courseDrafts.find((c) => c.id === course.id) ?? d.courses.find((c) => c.id === course.id);
    if (course.publicationNote && course.publicationNote.length > 1000)
      return 'Publication notes are limited to 1000 characters.';
    const plan = course.assignmentPlan;
    if (
      plan &&
      (!['By Role', 'By Team', 'Individual Worker', 'From HR Staff Profile'].includes(
        plan.method,
      ) ||
        !['Normal', 'High', 'Urgent'].includes(plan.priority) ||
        !validDate(plan.due) ||
        !Number.isInteger(plan.recurrenceMonths) ||
        plan.recurrenceMonths < 0 ||
        plan.recurrenceMonths > 120 ||
        plan.channels.some((channel) => !['Email', 'App', 'In-platform'].includes(channel)) ||
        plan.message.length > 2000)
    )
      return 'Check the assignment method, due date, priority, recurrence and notification channels.';

    if (
      course.prerequisiteCourseIds?.includes(course.id) ||
      course.prerequisiteCourseIds?.some((id) => !d.courses.some((c) => c.id === id))
    )
      return 'Choose existing prerequisite courses without a self-reference.';
    if (
      course.prerequisiteCourseIds?.some((id) =>
        d.courses.find((c) => c.id === id)?.prerequisiteCourseIds?.includes(course.id),
      )
    )
      return 'Course prerequisites cannot contain a cycle.';
    const graph = new Map(
      [...d.courses, ...d.courseDrafts, course].map((c) => [c.id, c.prerequisiteCourseIds ?? []]),
    );
    const visiting = new Set<string>(),
      visited = new Set<string>();
    const cyclic = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      if ((graph.get(id) ?? []).some(cyclic)) return true;
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    if ([...graph.keys()].some(cyclic)) return 'Course prerequisites cannot contain a cycle.';
    if (
      course.evidenceType &&
      ![
        'Internal knowledge completion',
        'Practical observation record',
        'Portable qualification evidence',
      ].includes(course.evidenceType)
    )
      return 'Choose a supported evidence type.';
    if (
      course.policy?.feedbackDelayHours !== undefined &&
      (!Number.isFinite(course.policy.feedbackDelayHours) ||
        course.policy.feedbackDelayHours < 0 ||
        course.policy.feedbackDelayHours > 720)
    )
      return 'Feedback delay must be between 0 and 720 hours.';
    if (course.status === 'Published' && !this.can('publish'))
      return 'Only an authorised publisher can publish courses.';
    if (old && old.updatedAt !== expected) return 'This course changed. Reload before saving.';
    const groupError = this.groupValidation(course);
    if (groupError) return groupError;
    if (
      course.assessmentMinutes !== undefined &&
      (!Number.isInteger(course.assessmentMinutes) ||
        course.assessmentMinutes < 0 ||
        course.assessmentMinutes > 240)
    )
      return 'Estimated assessment duration must be a whole number between 0 and 240 minutes.';
    if (course.modules) {
      const modules = course.modules;
      if (
        new Set(modules.map((m) => m.id)).size !== modules.length ||
        new Set(modules.map((m) => m.title.trim().toLowerCase())).size !== modules.length ||
        modules.some(
          (m, i) =>
            !m.id ||
            !m.title.trim() ||
            m.title.length > 180 ||
            (m.watchThreshold !== undefined &&
              (!Number.isFinite(m.watchThreshold) ||
                m.watchThreshold < 0 ||
                m.watchThreshold > 100)) ||
            m.prerequisiteModuleIds?.some(
              (id) => !modules.slice(0, i).some((previous) => previous.id === id),
            ),
        ) ||
        course.lessons.some(
          (l) => !modules.some((m) => m.id === l.moduleId && m.title === l.moduleTitle),
        )
      )
        return 'Use unique module titles and IDs, place prerequisite modules first, and assign every lesson to its module.';
      const order = course.lessons.map((l) => modules.findIndex((m) => m.id === l.moduleId));
      if (order.some((value, i) => i > 0 && value < order[i - 1]))
        return 'Keep each module’s lessons together in course order.';
      if (
        course.status === 'Published' &&
        modules.some((m) => !course.lessons.some((l) => l.moduleId === m.id))
      )
        return 'Add a lesson to every module before publishing.';
    }
    if (
      course.estimatedMinutes !== undefined &&
      (!Number.isInteger(course.estimatedMinutes) ||
        course.estimatedMinutes < 1 ||
        course.estimatedMinutes > 4800)
    )
      return 'Estimated duration must be a whole number between 1 and 4800 minutes.';
    if (
      course.tags &&
      (course.tags.length > 30 || course.tags.some((t) => !t.trim() || t.length > 80))
    )
      return 'Use up to 30 course tags, each containing 1–80 characters.';
    if (
      course.code?.trim() &&
      [...d.courses, ...d.courseDrafts].some(
        (c) =>
          c.id !== course.id && c.code?.trim().toLowerCase() === course.code!.trim().toLowerCase(),
      )
    )
      return 'Course code must be unique in this company.';
    if (
      !course.title.trim() ||
      course.title.length > 180 ||
      !course.description.trim() ||
      course.cpdHours < 0 ||
      course.cpdHours > 100 ||
      !Number.isFinite(course.cpdHours) ||
      (course.passMark !== null &&
        (!Number.isInteger(course.passMark) || course.passMark < 1 || course.passMark > 100)) ||
      (course.validityMonths !== null &&
        (!Number.isInteger(course.validityMonths) ||
          course.validityMonths < 0 ||
          course.validityMonths > 120))
    )
      return 'Enter a title, description, valid CPD hours, pass mark and certificate validity.';
    if (
      !['Draft', 'Published', 'Archived'].includes(course.status) ||
      new Set(course.lessons.map((l) => l.id)).size !== course.lessons.length ||
      course.lessons.some(
        (l) => !l.title.trim() || !Number.isFinite(l.minutes) || l.minutes < 1 || l.minutes > 480,
      )
    )
      return 'Check lesson titles, durations and publication status.';
    if (
      new Set(courseMediaLessons(course).map((l) => l.id)).size !==
        courseMediaLessons(course).length ||
      course.pendingLessons?.some(
        (l) =>
          !l.id ||
          !l.title.trim() ||
          !Number.isFinite(l.minutes) ||
          l.minutes < 1 ||
          l.minutes > 480 ||
          (!l.videoId && !l.handoutIds.length),
      )
    )
      return 'Check unused upload titles, durations and unique IDs; remove empty uploads.';
    if (
      course.status === 'Published' &&
      (!course.lessons.length ||
        course.lessons.some((l) => !l.content.trim() && !l.videoId) ||
        !d.questions.some((q) => q.courseId === course.id && q.status === 'Published') ||
        d.questions.some(
          (q) =>
            q.courseId === course.id &&
            q.status === 'Published' &&
            !course.lessons.some((l) => l.id === q.lessonId),
        ))
    )
      return 'Published courses require lesson content and at least one published assessment question.';
    if (course.status === 'Published' && hasUnusedVideos(course))
      return 'Add every unused video to a module or delete it from this course before publishing.';
    if (course.status === 'Published') {
      const questions = d.questions.filter(
        (q) => q.courseId === course.id && q.status === 'Published',
      );
      if (
        questions.some((q) => {
          const survey = course.questionGroups?.find((g) => g.id === q.groupId)?.kind === 'Survey';
          return survey
            ? !!q.correctIds.length || !!q.critical
            : q.type === 'Free text' || !q.correctIds.length;
        })
      )
        return 'Republish questions with the correct survey or quiz rules for their group.';
      if (!questions.some((q) => !q.groupId || q.groupId === 'final'))
        return 'Publish at least one final assessment question.';
      if (
        questions.some(
          (q) =>
            q.groupId &&
            q.groupId !== 'final' &&
            !course.questionGroups?.some((g) => g.id === q.groupId),
        ) ||
        course.questionGroups?.some((g) => !questions.some((q) => q.groupId === g.id))
      )
        return 'Each question group needs published questions and a valid placement before course publication.';
    }
    if (course.status === 'Published' && !course.sample) {
      if (
        !course.code?.trim() ||
        !course.outcomes?.trim() ||
        !course.owner?.trim() ||
        !course.issuer?.trim() ||
        !course.approver?.trim() ||
        !course.rights?.trim() ||
        !course.targetRoles?.length ||
        !validDate(course.effectiveDate ?? '')
      )
        return 'Complete course code, outcomes, audience, owner, approved issuer, approver, rights and effective date before publication.';
      if (
        d.courses.some(
          (c) => c.id !== course.id && c.code?.toLowerCase() === course.code?.trim().toLowerCase(),
        )
      )
        return 'Course code must be unique in this company.';
    }
    if (
      course.policy &&
      (!Number.isInteger(course.policy.maxAttempts) ||
        course.policy.maxAttempts < 1 ||
        course.policy.maxAttempts > 10 ||
        !Number.isFinite(course.policy.retakeWaitHours) ||
        course.policy.retakeWaitHours < 0 ||
        course.policy.retakeWaitHours > 720 ||
        !Number.isInteger(course.policy.timeLimitMinutes) ||
        course.policy.timeLimitMinutes < 0 ||
        course.policy.timeLimitMinutes > 240)
    )
      return 'Check the course attempt limit, retake wait and assessment timer.';
    if (
      course.lessons.some(
        (l, index) =>
          (l.prerequisiteIds ?? []).some(
            (id) => !course.lessons.slice(0, index).some((previous) => previous.id === id),
          ) ||
          (l.watchThreshold !== undefined &&
            (!Number.isFinite(l.watchThreshold) || l.watchThreshold < 0 || l.watchThreshold > 100)),
      )
    )
      return 'Prerequisites must be earlier lessons and watch thresholds must be 0–100%.';
    if (
      course.status === 'Published' &&
      course.lessons.some(
        (l) =>
          (l.mandatory !== false &&
            [l.videoId, ...l.handoutIds]
              .filter(Boolean)
              .some((id) => d.assets.find((a) => a.id === id)?.status !== 'READY')) ||
          (l.videoId && (!l.captionId || !l.transcript.trim())),
      )
    )
      return 'Mandatory media must be READY; videos also require reviewed captions and a transcript.';
    const media = [
      course.thumbnailId,
      ...courseMediaLessons(course).flatMap((l) => [
        l.videoId,
        l.thumbnailId,
        l.captionId,
        ...l.handoutIds,
      ]),
    ].filter(Boolean);
    if (media.some((id) => !d.assets.some((a) => a.id === id)))
      return 'A referenced media asset is no longer available.';
    const correctKind = (id: string, kind: string) =>
      !id || d.assets.some((a) => a.id === id && a.kind === kind);
    if (
      !correctKind(course.thumbnailId, 'Image') ||
      courseMediaLessons(course).some(
        (l) =>
          !correctKind(l.videoId, 'Video') ||
          !correctKind(l.thumbnailId, 'Image') ||
          !correctKind(l.captionId, 'Captions') ||
          l.handoutIds.some((id) => !correctKind(id, 'Document')),
      )
    )
      return 'Choose matching video, image, caption and document assets.';
    this.pinAssignments(d, course.id);
    const saved = {
      ...structuredClone(course),
      assessmentQuestions:
        course.status === 'Published'
          ? structuredClone(
              d.questions.filter((q) => q.courseId === course.id && q.status === 'Published'),
            )
          : course.assessmentQuestions,
      ...(course.status === 'Published'
        ? {
            policy: this.policyFor(course, d.settings),
            passMark: course.passMark ?? d.settings.passMark,
            validityMonths: course.validityMonths ?? d.settings.validityMonths,
            publishedAt: new Date().toISOString(),
            publishedBy: this.auth.currentUser()!.name,
          }
        : {}),
      title: course.title.trim(),
      version: (old?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    if (course.status === 'Published') {
      d.courseVersions ??= [];
      const previous = d.courses.find((c) => c.id === course.id && c.status === 'Published');
      if (
        previous &&
        !d.courseVersions.some((c) => c.id === previous.id && c.version === previous.version)
      ) {
        const { assignmentPlan, pendingLessons, ...content } = previous;
        d.courseVersions.push(
          structuredClone({
            ...content,
            assessmentQuestions:
              previous.assessmentQuestions ??
              d.questions.filter((q) => q.courseId === course.id && q.status === 'Published'),
          }),
        );
      }
      d.courseVersions.push(this.snapshotCourse(saved, d.settings));
    }
    d.courseDrafts = d.courseDrafts.filter((c) => c.id !== course.id);
    if (course.status === 'Draft') d.courseDrafts.push(saved);
    else
      d.courses = d.courses.some((c) => c.id === course.id)
        ? d.courses.map((c) => (c.id === course.id ? saved : c))
        : [...d.courses, saved];
    return null;
  }
  saveQuestion(question: AcademyQuestion, workspace: string, expected = ''): string | null {
    return this.change(
      workspace,
      'Question saved',
      question.id + ' · ' + question.text.slice(0, 120),
      (d) => this.applyQuestion(d, question, expected),
    );
  }
  private applyQuestion(
    d: AcademyData,
    question: AcademyQuestion,
    expected: string,
  ): string | null {
    const old =
      d.questionDrafts.find((q) => q.id === question.id) ??
      d.questions.find((q) => q.id === question.id);
    if (old && old.updatedAt !== expected) return 'This question changed. Reload before saving.';
    const course =
      d.courseDrafts.find((c) => c.id === question.courseId) ??
      d.courses.find((c) => c.id === question.courseId);
    if (!course || !course.lessons.some((l) => l.id === question.lessonId))
      return 'Choose a course and one of its lessons.';
    const survey = course.questionGroups?.find((g) => g.id === question.groupId)?.kind === 'Survey';
    if (question.type === 'Free text' && !survey)
      return 'Free text questions belong in a survey group.';
    if (survey && (question.critical || question.correctIds.length))
      return 'Survey questions cannot have correct answers or critical pass conditions.';
    if (
      question.groupId &&
      question.groupId !== 'final' &&
      !course.questionGroups?.some((g) => g.id === question.groupId)
    )
      return 'Choose a question group configured for this course.';
    if (
      question.order !== undefined &&
      (!Number.isInteger(question.order) || question.order < 0 || question.order > 10000)
    )
      return 'Use a valid question order.';
    if (
      !question.text.trim() ||
      question.text.length > 2000 ||
      !question.category.trim() ||
      !['Single choice', 'Multiple choice', 'True / false', 'Free text'].includes(question.type) ||
      !['Easy', 'Medium', 'Hard'].includes(question.difficulty) ||
      !['Draft', 'Published', 'Archived'].includes(question.status) ||
      !Number.isInteger(question.weight) ||
      question.weight < 1 ||
      question.weight > 10
    )
      return 'Complete the question, category, type, difficulty and marks.';
    if (
      question.status !== 'Draft' &&
      question.type !== 'Free text' &&
      (question.options.length < 2 ||
        question.options.length > 8 ||
        question.options.some((o) => !o.text.trim()) ||
        new Set(question.options.map((o) => o.id)).size !== question.options.length ||
        new Set(question.options.map((o) => o.text.trim().toLowerCase())).size !==
          question.options.length)
    )
      return 'Provide 2–8 distinct answer options.';
    if (
      question.status !== 'Draft' &&
      !survey &&
      (!question.correctIds.length ||
        new Set(question.correctIds).size !== question.correctIds.length ||
        question.correctIds.some((id) => !question.options.some((o) => o.id === id)) ||
        (question.type !== 'Multiple choice' && question.correctIds.length !== 1) ||
        (question.type === 'True / false' && question.options.length !== 2))
    )
      return 'Choose the correct answer or answers for this question type.';
    if (question.status === 'Published' && !survey && !question.explanation.trim())
      return 'Add an explanation before publishing.';
    if (question.imageId && !d.assets.some((a) => a.id === question.imageId && a.kind === 'Image'))
      return 'Choose an available image.';
    this.pinAssignments(d, question.courseId);
    if (question.status === 'Published') {
      const published = d.courses.find((c) => c.id === question.courseId);
      if (published && !published.assessmentQuestions)
        published.assessmentQuestions = structuredClone(
          d.questions.filter((q) => q.courseId === question.courseId && q.status === 'Published'),
        );
    }
    const saved = {
      ...structuredClone(question),
      version: (old?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    d.questionDrafts = d.questionDrafts.filter((q) => q.id !== question.id);
    if (question.status === 'Draft') d.questionDrafts.push(saved);
    else
      d.questions = d.questions.some((q) => q.id === question.id)
        ? d.questions.map((q) => (q.id === question.id ? saved : q))
        : [...d.questions, saved];
    return null;
  }
  saveQuestionBank(
    courseId: string,
    questions: AcademyQuestion[],
    groups: AcademyQuestionGroup[],
    expected: string,
    workspace: string,
  ): string | null {
    return this.change(workspace, 'Question bank saved', courseId, (d) => {
      const course =
        d.courseDrafts.find((c) => c.id === courseId) ?? d.courses.find((c) => c.id === courseId);
      if (!course || course.updatedAt !== expected)
        return 'This course changed. Reload the bank before saving.';
      const candidate = {
        ...structuredClone(course),
        questionGroups: structuredClone(groups),
        status: 'Draft' as const,
      };
      const error = this.groupValidation(candidate);
      if (error) return error;
      if (
        new Set(questions.map((q) => q.id)).size !== questions.length ||
        questions.some((q) => q.courseId !== courseId)
      )
        return 'Keep every question in the selected course bank.';
      this.pinAssignments(d, courseId);
      const groupsChanged = JSON.stringify(course.questionGroups ?? []) !== JSON.stringify(groups);
      if (groupsChanged) {
        candidate.version = course.version + 1;
        candidate.updatedAt = new Date().toISOString();
        d.courseDrafts = [...d.courseDrafts.filter((c) => c.id !== courseId), candidate];
      }
      for (const question of questions) {
        const old =
          d.questionDrafts.find((q) => q.id === question.id) ??
          d.questions.find((q) => q.id === question.id);
        if (old && JSON.stringify(old) === JSON.stringify(question)) continue;
        const error = this.applyQuestion(d, question, question.updatedAt);
        if (error) return error;
        d.events.unshift({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: this.auth.currentUser()!.name,
          action: 'Question saved',
          detail: question.id + ' · ' + question.text.slice(0, 120),
          personId: '',
        });
      }
      return null;
    });
  }

  assign(
    personIds: string[],
    courseIds: string[],
    due: string,
    recurrenceMonths: number,
    message: string,
    notify: boolean,
    renew: boolean,
    workspace: string,
    options: AcademyAssignmentOptions = {},
  ): string | null {
    return 'Open Manage training to save assignments to the current company.';
  }
  assignmentTargets(course: AcademyCourse, plan: AcademyAssignmentPlan) {
    return this.assignmentApi
      .staff()
      .filter(
        (p) =>
          p.status === 'Active' &&
          (!course.targetRoles?.length || course.targetRoles.includes(p.role)) &&
          (!course.targetBranches?.length || course.targetBranches.includes(p.location)),
      )
      .filter((p) => {
        const team = p.department;
        return plan.method === 'By Role'
          ? plan.roles.includes(p.role) && (plan.team === 'All' || team === plan.team)
          : plan.method === 'By Team'
            ? plan.team !== 'All' &&
              team === plan.team &&
              (!plan.roles.length || plan.roles.includes(p.role))
            : plan.personIds.includes(p.id);
      });
  }
  saveRulesAndAssign(
    course: AcademyCourse,
    personIds: string[],
    expected: string,
    workspace: string,
  ): string | null {
    return 'Open Rules and assignments to publish and assign training.';
  }
  bulk(
    personIds: string[],
    action: 'remind' | 'extend',
    due: string,
    workspace: string,
  ): string | null {
    return 'Open Manage training to save assignment changes.';
  }
  enrol(courseId: string, workspace: string): string | null {
    return 'Ask your training manager to assign this course.';
  }
  private async assessmentWrite(
    workspace: string,
    callback: () => Promise<unknown>,
  ): Promise<string | null> {
    if (workspace !== this.store.companyId())
      return 'The workspace changed. Reopen this assessment.';
    try {
      await callback();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
  async saveLesson(
    assignmentId: string,
    lessonId: string,
    note: string | null,
    position: number | null,
    complete: boolean,
    workspace: string,
  ): Promise<string | null> {
    return this.assessmentWrite(workspace, async () => {
      if (note !== null)
        await this.resultsApi.event(assignmentId, { kind: 'note', lessonId, text: note });
      if (position !== null)
        await this.resultsApi.event(assignmentId, {
          kind: 'position',
          lessonId,
          position: position.toFixed(3),
        });
      if (complete) await this.resultsApi.event(assignmentId, { kind: 'completed', lessonId });
    });
  }
  async startAttempt(
    assignmentId: string,
    workspace: string,
    groupId = '',
  ): Promise<{ id: string; error: string | null }> {
    let id = '';
    const error = await this.assessmentWrite(workspace, async () => {
      id = (await this.resultsApi.start(assignmentId, groupId)).attempt.id;
    });
    return { id, error };
  }
  async answer(
    attemptId: string,
    questionId: string,
    answerIds: string[],
    flag: boolean | null,
    workspace: string,
  ): Promise<string | null> {
    return this.assessmentWrite(workspace, () =>
      this.resultsApi.answer(attemptId, questionId, answerIds, flag),
    );
  }
  async submit(attemptId: string, workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.resultsApi.submit(attemptId));
  }
  async recordResourceOpen(
    assignmentId: string,
    resourceId: string,
    workspace: string,
  ): Promise<string | null> {
    return this.assessmentWrite(workspace, () =>
      this.resultsApi.event(assignmentId, { kind: 'opened', assetId: resourceId }),
    );
  }
  async acknowledgeResource(
    assignmentId: string,
    resourceId: string,
    workspace: string,
  ): Promise<string | null> {
    return this.assessmentWrite(workspace, () =>
      this.resultsApi.event(assignmentId, { kind: 'acknowledged', assetId: resourceId }),
    );
  }
  async revokeCertificate(id: string, reason: string, workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.certificatesApi.revoke(id, reason));
  }
  async scheduleRetake(
    attemptId: string,
    scheduledFor: string,
    workspace: string,
  ): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.resultsApi.schedule(attemptId, scheduledFor));
  }
  async notifyRetake(attemptId: string, workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.resultsApi.notify(attemptId));
  }
  async notifyManager(attemptId: string, workspace: string): Promise<string | null> {
    return this.assessmentWrite(workspace, () => this.resultsApi.requestSupport(attemptId));
  }
  generateReminders(_workspace: string): string {
    return 'Use the server-backed reminder command in academy settings.';
  }
  recordReport(kind: string, workspace: string): string | null {
    if (
      (!this.can('export') && !this.store.staff().some((p) => this.can('export', p.id))) ||
      workspace !== this.store.companyId()
    )
      return 'You do not have permission to export these records.';
    return this.store.saveWorkspace((data) => ({
      ...data,
      academy: {
        ...this.state(),
        events: [
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: this.auth.currentUser()!.name,
            action: 'Training report prepared',
            detail: kind,
            personId: '',
          },
          ...this.state().events,
        ],
      },
    }))
      ? null
      : 'Could not record export access.';
  }
  private template(value: string, course: string, due: string): string {
    return value.replaceAll('{{course}}', course).replaceAll('{{due}}', due || 'Not set');
  }
  saveAsset(asset: AcademyAsset, workspace: string): string | null {
    return this.change(workspace, 'Asset uploaded', asset.name, (d) => {
      d.assets.push(asset);
      return null;
    });
  }
  removeAsset(id: string, workspace: string): string | null {
    return this.change(workspace, 'Asset removed', id, (d) => {
      const refs = (s: AcademySettings) => [s.logoId, s.signatureId, s.backgroundId];
      if (
        refs(d.settings).includes(id) ||
        d.certificates.some((c) => refs(c.branding).includes(id)) ||
        [
          ...d.courses,
          ...d.courseDrafts,
          ...(d.courseVersions ?? []),
          ...d.assignments.flatMap((a) => (a.courseSnapshot ? [a.courseSnapshot] : [])),
        ].some(
          (c) =>
            c.thumbnailId === id ||
            c.assessmentQuestions?.some((q) => q.imageId === id) ||
            courseMediaLessons(c).some((l) =>
              [l.videoId, l.thumbnailId, l.captionId, ...l.handoutIds].includes(id),
            ),
        ) ||
        [...d.questions, ...d.questionDrafts].some((q) => q.imageId === id) ||
        d.assignments.some((a) => a.questionSnapshot?.some((q) => q.imageId === id)) ||
        d.attempts.some(
          (a) =>
            a.questions.some((q) => q.imageId === id) ||
            (!!a.award && refs(a.award.branding).includes(id)),
        )
      )
        return 'This asset is in use by a course, question, assessment or certificate.';
      d.assets = d.assets.filter((a) => a.id !== id);
      return null;
    });
  }
  assetReadable(id: string): boolean {
    if (!this.enabled()) return false;
    if (this.canManage()) return true;
    const person = this.me();
    if (!person) return false;
    const courses = this.assignments()
      .filter((a) => a.personId === person.id && !a.archived)
      .map((a) => a.courseId);
    return (
      this.assignments().some(
        (a) =>
          a.personId === person.id &&
          !a.archived &&
          ((a.courseSnapshot &&
            [
              a.courseSnapshot.thumbnailId,
              ...a.courseSnapshot.lessons.flatMap((l) => [
                l.videoId,
                l.thumbnailId,
                l.captionId,
                ...l.handoutIds,
              ]),
            ].includes(id)) ||
            a.questionSnapshot?.some((q) => q.imageId === id)),
      ) ||
      this.state().courses.some(
        (c) =>
          c.status === 'Published' &&
          courses.includes(c.id) &&
          (c.thumbnailId === id ||
            c.lessons.some((l) =>
              [l.videoId, l.thumbnailId, l.captionId, ...l.handoutIds].includes(id),
            )),
      ) ||
      this.state().questions.some(
        (q) => q.status === 'Published' && courses.includes(q.courseId) && q.imageId === id,
      ) ||
      this.state().attempts.some(
        (a) => a.personId === person.id && a.questions.some((q) => q.imageId === id),
      )
    );
  }
}
