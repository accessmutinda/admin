import {
  AcademyCapability,
  requirementsFor,
  evidenceCurrent,
  courseApplies,
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
  readonly store = inject(ManagementStore);
  readonly auth = inject(AuthService);
  readonly state = computed(() => {
    const state = this.store.data().academy;
    return state
      ? {
          ...state,
          completions: state.completions ?? [],
          accessRequests: state.accessRequests ?? [],
          courseDrafts: state.courseDrafts ?? [],
          questionDrafts: state.questionDrafts ?? [],
        }
      : emptyAcademy();
  });
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
  readonly enabled = computed(
    () =>
      this.auth.isSuperAdmin() ||
      this.auth.hasRole('CA') ||
      (!!this.auth.currentUser() && !!this.store.company()?.modules.includes('Training academy')),
  );
  readonly canManage = computed(() =>
    (['author', 'publish', 'assign', 'review', 'correct', 'configure'] as AcademyCapability[]).some(
      (cap) => this.can(cap),
    ),
  );
  readonly canViewEvidence = computed(() => {
    if (this.auth.isSuperAdmin() || this.auth.hasRole('CA')) return true;
    const user = this.auth.currentUser();
    if (!user || !this.enabled()) return false;
    const grants =
      this.state().governance?.grants.filter(
        (g) => g.email.toLowerCase() === user.email.toLowerCase(),
      ) ?? [];
    if (grants.length)
      return grants.some(
        (g) =>
          !g.revokedAt &&
          g.capabilities.includes('evidence') &&
          Date.parse(g.startsAt) <= Date.now() &&
          Date.parse(g.expiresAt) > Date.now(),
      );
    if (this.can('evidence')) return true;
    if (!['QA', 'CO'].includes(user.roleCode)) return false;
    const permission =
      this.store.data().permissions[ROLES[user.roleCode].label + ':Training academy'];
    return !permission || !!permission[0];
  });
  can(capability: AcademyCapability, personId = ''): boolean {
    if (this.auth.isSuperAdmin() || this.auth.hasRole('CA')) return true;
    if (!this.enabled()) return false;
    const user = this.auth.currentUser();
    if (!user) return false;
    const grants =
      this.state().governance?.grants.filter(
        (g) => g.email.toLowerCase() === user.email.toLowerCase(),
      ) ?? [];
    if (grants.length)
      return grants.some(
        (g) =>
          !g.revokedAt &&
          Date.parse(g.startsAt) <= Date.now() &&
          Date.parse(g.expiresAt) > Date.now() &&
          g.capabilities.includes(capability) &&
          (!g.personIds.length || (!!personId && g.personIds.includes(personId))),
      );
    const defaults: Record<string, AcademyCapability[]> = {
      PO: [
        'author',
        'publish',
        'assign',
        'review',
        'correct',
        'configure',
        'export',
        'evidence',
        'diagnostics',
      ],
      CA: [
        'author',
        'publish',
        'assign',
        'review',
        'correct',
        'configure',
        'export',
        'evidence',
        'diagnostics',
      ],
      RM: [
        'author',
        'publish',
        'assign',
        'review',
        'correct',
        'configure',
        'export',
        'evidence',
        'diagnostics',
      ],
      TM: ['author', 'publish', 'assign', 'review', 'export', 'evidence'],
      HR: ['assign', 'review', 'correct', 'export', 'evidence'],
      QA: ['evidence', 'export'],
      CO: ['evidence', 'export'],
    };
    if (capability === 'diagnostics' && ['CA', 'PO', 'RM'].includes(user.roleCode)) return true;
    const configured =
      this.state().governance?.capabilityRoles?.[user.roleCode] ?? defaults[user.roleCode] ?? [];
    const permission =
      this.store.data().permissions[ROLES[user.roleCode].label + ':Training academy'];
    return (
      configured.includes(capability) &&
      (!permission ||
        (!!permission[0] &&
          (['evidence', 'export', 'review'].includes(capability) ||
            (!!permission[1] && !!permission[2])))) &&
      (this.state().governance?.capabilityRoles?.[user.roleCode] !== undefined ||
        ['PO', 'CA', 'QA', 'CO'].includes(user.roleCode) ||
        this.state().settings.adminRoles.includes(user.roleCode))
    );
  }
  feedbackVisible(attempt: AcademyAttempt): boolean {
    if (this.can('author') || this.can('review', attempt.personId)) return true;
    return (
      !!attempt.submittedAt &&
      attempt.showFeedback &&
      !attempt.invalidatedAt &&
      (attempt.policy?.feedbackMode !== 'Manager release' || !!attempt.feedbackReleasedAt) &&
      (!attempt.feedbackAvailableAt || Date.parse(attempt.feedbackAvailableAt) <= Date.now())
    );
  }
  readonly me = computed(() => {
    const email = this.auth.currentUser()?.email.toLowerCase();
    const matches = this.store
      .staff()
      .filter(
        (p) =>
          p.email.toLowerCase() === email && !['Inactive', 'Left'].includes(p.hr?.status ?? ''),
      );
    return matches.length === 1 ? matches[0] : undefined;
  });
  readonly assignments = computed(() => {
    const saved = this.state().assignments;
    return [
      ...saved,
      ...this.store
        .staff()
        .flatMap((p) =>
          p.learning
            .filter(
              (id) =>
                this.state().courses.some((c) => c.id === id) &&
                !saved.some((a) => a.personId === p.id && a.courseId === id),
            )
            .map((id) => legacyAssignment(p, id)),
        ),
    ];
  });
  owns(personId: string): boolean {
    return this.enabled() && this.me()?.id === personId;
  }
  canReadPerson(personId: string): boolean {
    return this.enabled() && (this.can('evidence', personId) || this.owns(personId));
  }
  canBrowseCourse(course: AcademyCourse): boolean {
    if (!this.enabled()) return false;
    if (this.canManage()) return true;
    const person = this.me();
    if (!person) return false;
    if (course.targetBranches?.length && !course.targetBranches.includes(person.location))
      return false;
    if (
      this.assignments().some(
        (a) => a.personId === person.id && a.courseId === course.id && !a.archived,
      )
    )
      return true;
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
      .certificates.filter((c) => c.assignmentId === assignmentId && !c.revokedAt)
      .at(-1);
    return this.state().completions?.find(
      (j) =>
        j.assignmentId === assignmentId &&
        this.canReadPerson(j.personId) &&
        (c?.replacesId ? j.certificateId === c.id : !j.certificateId || j.certificateId === c?.id),
    );
  }
  canReadCertificate(): boolean {
    return this.canViewEvidence();
  }
  certificate(id: string) {
    return this.state().certificates.find(
      (c) => c.id === id && this.canReadCertificate() && this.can('evidence', c.personId),
    );
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
    const assignment = this.assignment(assignmentId);
    if (!assignment) return 'Assignment unavailable.';
    return this.change(
      workspace,
      'Lesson progress saved',
      lessonId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived)!;
        const lesson = this.assignedCourse(a)?.lessons.find((l) => l.id === lessonId);
        if (!lesson?.videoId || this.lessonBlock(a, lessonId))
          return 'Video lesson is locked or unavailable.';
        if (
          [start, end, duration, elapsedSeconds].some((v) => !Number.isFinite(v)) ||
          start < 0 ||
          end < 0 ||
          duration <= 0 ||
          end > duration + 1 ||
          start > duration ||
          elapsedSeconds < 0
        )
          return 'Invalid video progress.';
        a.positions[lessonId] = Math.min(end, duration);
        a.videoDurations = { ...a.videoDurations, [lessonId]: duration };
        if (end <= start || end - start > Math.min(elapsedSeconds, 15) * 2 + 0.5) return null;
        const ranges = [
          ...(a.watchedRanges?.[lessonId] ?? []),
          [start, Math.min(end, duration)] as [number, number],
        ].sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const range of ranges) {
          const last = merged.at(-1);
          if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
          else merged.push([...range]);
        }
        a.watchedRanges = { ...a.watchedRanges, [lessonId]: merged };
        return null;
      },
      assignment.personId,
      false,
    );
  }
  requestTrainingRecords(workspace: string): string | null {
    const person = this.me();
    if (!person) return 'Your account is not linked to a staff record.';
    return this.change(
      workspace,
      'Training records access requested',
      person.id,
      (d) => {
        d.accessRequests ??= [];
        if (d.accessRequests.some((r) => r.personId === person.id && r.status === 'Requested'))
          return 'Your records access request is already awaiting HR review.';
        d.accessRequests.push({
          id: crypto.randomUUID(),
          tenantId: workspace,
          personId: person.id,
          createdAt: new Date().toISOString(),
          status: 'Requested',
          acknowledgedAt: '',
          acknowledgedBy: '',
        });
        return null;
      },
      person.id,
      false,
    );
  }
  acknowledgeRecordsRequest(id: string, workspace: string): string | null {
    return this.change(workspace, 'Training records access request acknowledged', id, (d) => {
      const request = d.accessRequests?.find((r) => r.id === id && r.tenantId === workspace);
      if (!request) return 'Request unavailable.';
      if (request.status === 'Acknowledged') return null;
      if (request.status !== 'Requested')
        return 'The disclosure request has already progressed; use its decision workflow.';
      request.status = 'Acknowledged';
      request.acknowledgedAt = new Date().toISOString();
      request.acknowledgedBy = this.auth.currentUser()!.name;
      return null;
    });
  }
  knowledgeCompliance(personId: string) {
    const person = this.store.staff().find((p) => p.id === personId);
    const rules = person ? requirementsFor(this.state(), person) : [];
    const required = rules
      .map((r) => this.state().courses.find((c) => c.id === r.courseId))
      .filter((c): c is AcademyCourse => !!c);
    const missing = required.filter(
      (course) =>
        !person ||
        !evidenceCurrent(
          this.state(),
          person,
          course.id,
          londonDate(),
          rules.find((r) => r.courseId === course.id),
        ),
    );
    return {
      required: required.length,
      missing,
      compliant: required.length ? missing.length === 0 : null,
      percent: required.length
        ? Math.round(((required.length - missing.length) / required.length) * 100)
        : null,
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
    if (this.state().attempts.some((t) => t.assignmentId === a.id && !t.groupId && t.invalidatedAt))
      return 'Evidence review';
    const certificate =
      this.state()
        .certificates.filter((c) => c.assignmentId === a.id && !c.revokedAt)
        .at(-1) ?? this.state().certificates.find((c) => c.assignmentId === a.id);
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
    if (a.completedAt && this.completion(a.id)?.status !== 'COMPLETE_SYNCED')
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
  saveSettings(settings: AcademySettings, workspace: string, expected: string): string | null {
    return this.change(
      workspace,
      'Academy settings saved',
      'Assessment, certificates and learning rules',
      (d) => {
        if (d.settings.updatedAt !== expected)
          return 'Settings changed in another view. Reload before saving.';
        const integers = [
          settings.passMark,
          settings.maxAttempts,
          settings.timeLimitMinutes,
          settings.validityMonths,
          settings.reminderDays,
          settings.dueSoonDays,
          settings.refresherDays,
          settings.overdueDays,
        ];
        if (
          integers.some((v) => !Number.isInteger(v)) ||
          settings.passMark < 1 ||
          settings.passMark > 100 ||
          settings.maxAttempts < 1 ||
          settings.maxAttempts > 10 ||
          settings.timeLimitMinutes < 1 ||
          settings.timeLimitMinutes > 240 ||
          settings.validityMonths < 0 ||
          settings.validityMonths > 120 ||
          [
            settings.reminderDays,
            settings.dueSoonDays,
            settings.refresherDays,
            settings.overdueDays,
          ].some((v) => v < 0 || v > 365)
        )
          return 'Check the pass mark, attempts, time limit, validity and reminder periods.';
        if (
          ![settings.primary, settings.secondary].every((v) => /^#[\da-fA-F]{6}$/.test(v)) ||
          !['Standard', 'Modern', 'Minimal', 'Professional'].includes(settings.template) ||
          settings.adminRoles.some((r) => !Object.keys(ROLES).includes(r))
        )
          return 'Choose valid branding colours, template and roles.';
        if (
          [settings.logoId, settings.backgroundId, settings.signatureId].some(
            (id) => id && !d.assets.some((a) => a.id === id && a.kind === 'Image'),
          )
        )
          return 'Choose saved image assets for certificate branding.';
        if (Object.values(settings.notificationTemplates).some((v) => !v.trim() || v.length > 2000))
          return 'Notification templates must contain 1–2000 characters.';
        d.settings = { ...structuredClone(settings), updatedAt: new Date().toISOString() };
        return null;
      },
    );
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
    return this.change(
      workspace,
      'Training assigned',
      `${personIds.length} staff · ${courseIds.length} courses`,
      (d) =>
        this.applyAssignments(
          d,
          personIds,
          courseIds,
          due,
          recurrenceMonths,
          message,
          notify,
          renew,
          workspace,
          options,
        ),
    );
  }
  private applyAssignments(
    d: AcademyData,
    personIds: string[],
    courseIds: string[],
    due: string,
    recurrenceMonths: number,
    message: string,
    notify: boolean,
    renew: boolean,
    workspace: string,
    options: AcademyAssignmentOptions,
  ): string | null {
    if (
      (options.source &&
        !['By Role', 'By Team', 'Individual Worker', 'From HR Staff Profile'].includes(
          options.source,
        )) ||
      (options.priority && !['Normal', 'High', 'Urgent'].includes(options.priority)) ||
      options.notificationChannels?.some((c) => !['Email', 'App', 'In-platform'].includes(c))
    )
      return 'Choose valid assignment source, priority and notification channels.';

    if (
      options.expectedCourseUpdatedAt !== undefined &&
      courseIds.some(
        (id) => d.courses.find((c) => c.id === id)?.updatedAt !== options.expectedCourseUpdatedAt,
      )
    )
      return 'The published course changed. Reload and review the assignment again.';
    if (
      !personIds.length ||
      !courseIds.length ||
      personIds.some(
        (id) =>
          !this.store
            .staff()
            .some(
              (p) =>
                p.id === id &&
                !['Inactive', 'Left'].includes(p.hr?.status ?? '') &&
                !['Inactive', 'Left', 'Leaver', 'Terminated'].includes(p.stage),
            ),
      ) ||
      courseIds.some(
        (id) =>
          !d.courses.some(
            (c) =>
              c.id === id &&
              c.status === 'Published' &&
              c.active !== false &&
              (!c.effectiveDate || c.effectiveDate <= londonDate()),
          ),
      ) ||
      !validDate(due) ||
      !Number.isInteger(recurrenceMonths) ||
      recurrenceMonths < 0 ||
      recurrenceMonths > 120
    )
      return 'Choose current staff, published courses, a valid due date and recurrence.';
    if (
      courseIds.some((id) => {
        const course = d.courses.find((c) => c.id === id)!;
        return (
          (!!course.targetRoles?.length || !!course.targetBranches?.length) &&
          personIds.some(
            (personId) =>
              !courseApplies(
                course,
                this.store.staff().find((p) => p.id === personId)!,
              ),
          )
        );
      })
    )
      return 'One or more staff roles are outside this course’s approved audience.';
    if (
      options.supervisorId &&
      !this.store
        .staff()
        .some(
          (p) =>
            p.id === options.supervisorId && !['Inactive', 'Left'].includes(p.hr?.status ?? ''),
        )
    )
      return 'Choose an active supervisor.';
    for (const personId of new Set(personIds))
      for (const courseId of new Set(courseIds)) {
        const person = this.store.staff().find((p) => p.id === personId)!;
        const requirement = requirementsFor(d, person).find((r) => r.courseId === courseId);
        if (
          requirement &&
          (d.courses.find((c) => c.id === courseId)?.version ?? 0) < requirement.minimumVersion
        )
          return 'Publish a course version meeting the current requirement before assigning it.';
        let assignment = d.assignments.find(
          (a) => a.personId === personId && a.courseId === courseId && !a.archived,
        );
        if (assignment && !renew) {
          assignment.due = due;
          assignment.recurrenceMonths = recurrenceMonths;
        } else {
          if (assignment) assignment.archived = true;
          assignment = {
            ...legacyAssignment(
              this.store.staff().find((p) => p.id === personId)!,
              courseId,
            ),
            id: crypto.randomUUID(),
            assignedAt: new Date().toISOString(),
            assignedBy: this.auth.currentUser()!.name,
            due,
            recurrenceMonths,
            tenantId: workspace,
            courseVersion: d.courses.find((c) => c.id === courseId)!.version,
            renewalPolicyId: requirement?.id,
            courseSnapshot: {
              ...this.snapshotCourse(
                d.courses.find((c) => c.id === courseId)!,
                d.settings,
              ),
              ...(requirement ? { validityMonths: requirement.renewalMonths } : {}),
            },
            questionSnapshot: structuredClone(
              d.courses.find((c) => c.id === courseId)!.assessmentQuestions ??
                d.questions.filter((q) => q.courseId === courseId && q.status === 'Published'),
            ),
            policySnapshot: this.policyFor(
              d.courses.find((c) => c.id === courseId)!,
              d.settings,
            ),
            source: options.source ?? 'Academy / existing HR staff profile',
            priority: options.priority ?? 'Normal',
            supervisorId: options.supervisorId,
            type: renew ? 'Refresher' : 'Initial',
          };
          d.assignments.push(assignment);
        }
        if (options.priority) assignment.priority = options.priority;
        if (options.supervisorId !== undefined) assignment.supervisorId = options.supervisorId;
        const channels = notify
          ? [...new Set(options.notificationChannels ?? ['In-platform' as const])]
          : [];
        assignment.notificationChannels = channels;
        const requests = channels.map((channel) => ({
          channel,
          status:
            channel === 'Email' || !d.settings.portalNotifications
              ? ('Not configured' as const)
              : ('Recorded' as const),
          at: new Date().toISOString(),
        }));
        assignment.notificationRequests = [...(assignment.notificationRequests ?? []), ...requests];
        if (d.governance)
          for (const request of requests.filter((r) => r.channel !== 'In-platform'))
            d.governance.deliveries.push({
              id: crypto.randomUUID(),
              personId,
              assignmentId: assignment.id,
              channel: request.channel,
              title: 'Course assigned',
              text: message || 'Review your assigned training.',
              status: 'Queued',
              attempts: 0,
              nextAttemptAt: '',
              updatedAt: request.at,
              providerId: '',
              error: '',
              history: [
                {
                  at: request.at,
                  status: 'Queued',
                  detail: 'Requested channel; local simulation only',
                },
              ],
            });

        if (requests.some((r) => r.status === 'Recorded'))
          d.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId: assignment.id,
            personId,
            title: 'Course assigned',
            text:
              this.template(
                d.settings.notificationTemplates.assigned,
                d.courses.find((c) => c.id === courseId)!.title,
                due,
              ) + (message.trim() ? '\n' + message.trim() : ''),
            at: new Date().toISOString(),
            key: crypto.randomUUID(),
          });
      }
    return null;
  }
  assignmentTargets(course: AcademyCourse, plan: AcademyAssignmentPlan) {
    return this.store
      .staff()
      .filter(
        (p) =>
          !['Inactive', 'Left'].includes(p.hr?.status ?? '') &&
          !['Inactive', 'Left', 'Leaver', 'Terminated'].includes(p.stage) &&
          (!course.targetRoles?.length || course.targetRoles.includes(p.role)) &&
          (!course.targetBranches?.length || course.targetBranches.includes(p.location)),
      )
      .filter((p) => {
        const team = p.hr?.employment.department || 'Unassigned';
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
    return this.change(
      workspace,
      'Rules published and training assigned',
      course.id + ' · ' + personIds.length + ' staff',
      (d) => {
        const plan = course.assignmentPlan;
        if (!plan) return 'Configure the assignment plan before assigning training.';
        const targets = this.assignmentTargets(course, plan)
          .map((p) => p.id)
          .sort();
        if (
          (plan.method === 'From HR Staff Profile' && plan.personIds.length !== 1) ||
          JSON.stringify([...new Set(personIds)].sort()) !== JSON.stringify(targets)
        )
          return 'The selected staff do not match the reviewed assignment plan.';

        const error = this.applyCourse(d, { ...course, status: 'Published' }, expected);
        if (error) return error;
        return this.applyAssignments(
          d,
          personIds,
          [course.id],
          plan.due,
          plan.recurrenceMonths,
          plan.message,
          plan.channels.length > 0,
          plan.refresher,
          workspace,
          { source: plan.method, priority: plan.priority, notificationChannels: plan.channels },
        );
      },
    );
  }
  bulk(
    personIds: string[],
    action: 'remind' | 'extend',
    due: string,
    workspace: string,
  ): string | null {
    return this.change(
      workspace,
      action === 'remind' ? 'Training reminders recorded' : 'Training deadlines extended',
      `${personIds.length} staff`,
      (d) => {
        if (action === 'remind' && !d.settings.portalNotifications)
          return 'Portal notifications are disabled in academy settings.';
        const assignments = d.assignments.filter(
          (a) => personIds.includes(a.personId) && !a.archived && !a.completedAt,
        );
        if (
          !assignments.length ||
          personIds.some((id) => !this.store.staff().some((p) => p.id === id))
        )
          return 'Select staff with unfinished assignments.';
        if (
          action === 'extend' &&
          (!validDate(due) || assignments.some((a) => a.due && due <= a.due))
        )
          return 'The new deadline must be later than every selected existing deadline.';
        if (action === 'extend') assignments.forEach((a) => (a.due = due));
        else
          assignments.forEach((a) =>
            d.notices.unshift({
              id: crypto.randomUUID(),
              assignmentId: a.id,
              personId: a.personId,
              title: 'Training reminder',
              text: this.template(
                d.settings.notificationTemplates.assigned,
                d.courses.find((c) => c.id === a.courseId)?.title ?? 'Course',
                a.due || 'Not set',
              ),
              at: new Date().toISOString(),
              key: crypto.randomUUID(),
            }),
          );
        return null;
      },
    );
  }
  enrol(courseId: string, workspace: string): string | null {
    const person = this.me();
    if (!person) return 'Your account is not linked to a staff record.';
    return this.change(
      workspace,
      'Optional course enrolment',
      courseId,
      (d) => {
        const course = d.courses.find((c) => c.id === courseId && c.status === 'Published');
        if (
          !d.settings.allowSelfEnrolment ||
          !course ||
          course.mandatory ||
          !this.canBrowseCourse(course)
        )
          return 'Self-enrolment is not available for this course.';
        if (
          d.assignments.some(
            (a) => a.personId === person.id && a.courseId === courseId && !a.archived,
          )
        )
          return 'You are already enrolled.';
        d.assignments.push({
          ...legacyAssignment(person, courseId),
          id: crypto.randomUUID(),
          assignedAt: new Date().toISOString(),
          assignedBy: person.name,
          tenantId: workspace,
          courseVersion: course.version,
          courseSnapshot: this.snapshotCourse(course, d.settings),
          questionSnapshot: structuredClone(
            course.assessmentQuestions ??
              d.questions.filter((q) => q.courseId === courseId && q.status === 'Published'),
          ),
          policySnapshot: this.policyFor(course, d.settings),
          source: 'Learner optional enrolment',
          type: 'Initial',
        });
        return null;
      },
      person.id,
      false,
    );
  }
  saveLesson(
    assignmentId: string,
    lessonId: string,
    note: string | null,
    position: number | null,
    complete: boolean,
    workspace: string,
  ): string | null {
    const assignment = this.assignment(assignmentId);
    if (!assignment) return 'Assignment unavailable.';
    return this.change(
      workspace,
      complete ? 'Lesson completed' : 'Lesson progress saved',
      lessonId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived)!;
        const course =
          a.courseSnapshot ??
          d.courses.find((c) => c.id === a.courseId && c.status === 'Published');
        const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
        if (!course || index < 0) return 'Lesson is unavailable.';
        const block = this.lessonBlock(a, lessonId);
        if (block) return block;
        const lesson = course.lessons[index];
        if (
          complete &&
          lesson.videoId &&
          this.watchedPercent(a, lessonId) < (lesson.watchThreshold ?? 90)
        )
          return 'Watch the required portion of the video before completing this lesson.';
        if (
          complete &&
          lesson.requireResourceAck &&
          lesson.handoutIds.some(
            (id) =>
              !lesson.optionalHandoutIds?.includes(id) && !a.resourceAcknowledgements?.includes(id),
          )
        )
          return 'Open and acknowledge all required resources first.';
        if (note !== null) {
          if (note.length > 1000) return 'Notes are limited to 1000 characters.';
          a.notes[lessonId] = note;
        }
        if (position !== null) {
          if (!Number.isFinite(position) || position < 0) return 'Invalid video position.';
          a.positions[lessonId] = position;
        }
        if (complete && !a.completedLessonIds.includes(lessonId))
          a.completedLessonIds.push(lessonId);
        return null;
      },
      assignment.personId,
      false,
    );
  }
  startAttempt(
    assignmentId: string,
    workspace: string,
    groupId = '',
  ): { id: string; error: string | null } {
    if (workspace !== this.store.companyId())
      return { id: '', error: 'The workspace changed. Reopen the assessment.' };
    const assignment = this.assignment(assignmentId);
    if (!assignment) return { id: '', error: 'Assignment unavailable.' };
    groupId = groupId === 'final' ? '' : groupId;
    const availability = this.assessmentAvailability(assignment, Date.now(), groupId);
    if (availability.reason)
      return {
        id: '',
        error: availability.readyAt
          ? 'Retake available after ' +
            availability.readyAt +
            '. Review the learning or contact your training manager.'
          : availability.reason === 'Complete all required lessons to unlock the assessment.'
            ? 'Complete all lessons before starting the assessment.'
            : availability.reason,
      };
    const running = this.state().attempts.find(
      (a) => a.assignmentId === assignmentId && (a.groupId ?? '') === groupId && !a.submittedAt,
    );
    if (running && this.owns(assignment.personId)) return { id: running.id, error: null };
    const id = crypto.randomUUID();
    const error = this.change(
      workspace,
      'Assessment started',
      assignment.courseId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived);
        const course =
          a?.courseSnapshot ??
          d.courses.find((c) => c.id === assignment.courseId && c.status === 'Published');
        if (!a || !course) return 'Assignment or course unavailable.';
        const basePolicy = a.policySnapshot ?? this.policyFor(course, d.settings);
        const adjustment = d.governance?.adjustments
          .filter(
            (x) =>
              x.assignmentId === a.id &&
              x.personId === a.personId &&
              (!x.expires || x.expires >= londonDate()),
          )
          .at(-1);
        const policy = {
          ...basePolicy,
          timeLimitMinutes: adjustment?.untimed
            ? 0
            : basePolicy.timeLimitMinutes
              ? basePolicy.timeLimitMinutes + (adjustment?.extraMinutes ?? 0)
              : 0,
        };
        let questions =
          a.questionSnapshot ??
          d.questions.filter((q) => q.courseId === course.id && q.status === 'Published');
        questions = questions
          .filter((q) => (q.groupId === 'final' ? '' : (q.groupId ?? '')) === groupId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (!questions.length) return 'No published questions are available.';
        if (policy.shuffleQuestions ?? d.settings.shuffleQuestions) questions = shuffled(questions);
        questions = structuredClone(questions).map((q) => ({
          ...q,
          options:
            (policy.shuffleOptions ?? d.settings.shuffleOptions) && q.shuffle
              ? shuffled(q.options)
              : q.options,
        }));
        const now = Date.now();
        const group = course.questionGroups?.find((g) => g.id === groupId);
        const survey = group?.kind === 'Survey';
        const previous = d.attempts
          .filter((v) => v.assignmentId === a.id && (v.groupId ?? '') === groupId && v.submittedAt)
          .reverse()
          .sort((x, y) => y.submittedAt.localeCompare(x.submittedAt))[0];
        const plan = d.retakePlans?.find(
          (p) =>
            p.assignmentId === a.id &&
            p.groupId === groupId &&
            p.fromAttemptId === previous?.id &&
            !p.startedAttemptId,
        );
        if (plan) plan.startedAttemptId = id;
        d.attempts.push({
          groupId,
          groupKind: group?.kind ?? 'Quiz',
          countsTowardGrade: !groupId || !!group?.countsTowardGrade,
          contributingAttemptIds: groupId
            ? []
            : (course.questionGroups ?? [])
                .filter((g) => g.kind !== 'Survey' && g.countsTowardGrade)
                .map((g) => this.latestGroupAttempt(d.attempts, a.id, g.id)!.id),
          groupTitle: course.questionGroups?.find((g) => g.id === groupId)?.title,
          award: groupId
            ? undefined
            : {
                cpdHours: course.cpdHours,
                validityMonths: course.validityMonths ?? d.settings.validityMonths,
                sample: course.sample,
                branding: structuredClone(d.settings),
                issuer:
                  course.issuer?.trim() ||
                  d.settings.issuer.trim() ||
                  this.store.company()?.name ||
                  'CareVerity',
                learner: this.store.staff().find((p) => p.id === a.personId)!.name,
              },
          id,
          adjustment: adjustment ? structuredClone(adjustment) : undefined,
          policy: { ...structuredClone(policy), ...(survey ? { timeLimitMinutes: 0 } : {}) },
          assignmentId,
          personId: a.personId,
          courseId: course.id,
          courseTitle: course.title,
          courseVersion: course.version,
          questions,
          answers: {},
          flags: [],
          startedAt: new Date(now).toISOString(),
          deadline:
            !survey && policy.timeLimitMinutes
              ? new Date(now + policy.timeLimitMinutes * 60000).toISOString()
              : '9999-12-31T23:59:59.000Z',
          submittedAt: '',
          passMark: course.passMark ?? d.settings.passMark,
          showFeedback: survey ? false : policy.showFeedback,
          score: null,
          passed: false,
        });
        return null;
      },
      assignment.personId,
      false,
    );
    return { id: error ? '' : id, error };
  }
  answer(
    attemptId: string,
    questionId: string,
    answerIds: string[],
    flag: boolean | null,
    workspace: string,
  ): string | null {
    const attempt = this.attempt(attemptId);
    if (!attempt) return 'Assessment unavailable.';
    return this.change(
      workspace,
      'Assessment response saved',
      attempt.courseTitle,
      (d) => {
        const a = d.attempts.find((a) => a.id === attemptId)!;
        if (a.submittedAt || Date.parse(a.deadline) <= Date.now())
          return 'This assessment is submitted or the time limit has expired.';
        const q = a.questions.find((q) => q.id === questionId);
        if (
          !q ||
          (q.type === 'Free text'
            ? a.groupKind !== 'Survey' ||
              answerIds.length > 1 ||
              answerIds.some((text) => !text.trim() || text.length > 4000)
            : answerIds.some((id) => !q.options.some((o) => o.id === id))) ||
          new Set(answerIds).size !== answerIds.length ||
          (q.type !== 'Multiple choice' && answerIds.length > 1)
        )
          return 'Choose a valid answer.';
        a.answers[q.id] = [...answerIds];
        if (flag !== null)
          a.flags = flag ? [...new Set([...a.flags, q.id])] : a.flags.filter((id) => id !== q.id);
        return null;
      },
      attempt.personId,
      false,
    );
  }
  submit(attemptId: string, workspace: string): string | null {
    if (workspace !== this.store.companyId())
      return 'The workspace changed. Reopen the assessment.';
    const attempt = this.attempt(attemptId);
    if (!attempt) return 'Assessment unavailable.';
    if (attempt.invalidatedAt)
      return 'This attempt was invalidated after review; the original result is retained.';
    if (attempt.submittedAt)
      return this.owns(attempt.personId) ? null : 'Only the learner can submit.';
    return this.change(
      workspace,
      'Assessment submitted',
      attempt.courseTitle,
      (d) => {
        const a = d.attempts.find((v) => v.id === attemptId)!;
        if (
          Date.parse(a.deadline) > Date.now() &&
          a.questions.some((q) => q.required && !a.answers[q.id]?.length)
        )
          return 'Answer all required questions before submitting.';
        const assignment = d.assignments.find((v) => v.id === a.assignmentId && !v.archived);
        const course = assignment?.courseSnapshot ?? d.courses.find((c) => c.id === a.courseId);
        if (!assignment || !course)
          return 'Assignment or course changed. Contact the training manager.';
        const survey = a.groupKind === 'Survey';
        const gradedAttempts = [a];
        if (!a.groupId) {
          for (const group of course.questionGroups ?? []) {
            if (group.kind === 'Survey' || !group.countsTowardGrade) continue;
            const previous = a.contributingAttemptIds
              ? d.attempts.find(
                  (v) =>
                    a.contributingAttemptIds!.includes(v.id) &&
                    v.assignmentId === assignment.id &&
                    v.groupId === group.id &&
                    v.submittedAt &&
                    !v.invalidatedAt,
                )
              : this.latestGroupAttempt(d.attempts, assignment.id, group.id);
            if (!previous) return 'Complete all quizzes that count toward the final grade.';
            gradedAttempts.push(previous);
          }
        }
        a.sectionScore = survey ? null : gradeAttempt(a);
        a.gradeBreakdown = survey
          ? []
          : gradedAttempts.map((section) => ({
              groupId: section.groupId ?? '',
              title: section.groupTitle || 'Final course assessment',
              attemptId: section.id,
              earned: section.questions.reduce(
                (sum, q) => sum + (questionCorrect(q, section.answers[q.id] ?? []) ? q.weight : 0),
                0,
              ),
              available: section.questions.reduce((sum, q) => sum + q.weight, 0),
            }));
        const earned = a.gradeBreakdown.reduce((sum, section) => sum + section.earned, 0);
        const available = a.gradeBreakdown.reduce((sum, section) => sum + section.available, 0);
        a.score = survey ? null : available ? (earned / available) * 100 : 0;
        a.criticalFailed =
          !survey &&
          gradedAttempts.some((section) =>
            section.questions.some(
              (q) => q.critical && !questionCorrect(q, section.answers[q.id] ?? []),
            ),
          );
        a.passed = survey || (a.score! >= a.passMark && !a.criticalFailed);
        a.resultId = crypto.randomUUID();
        a.correlationId = crypto.randomUUID();
        a.scorerVersion = 'local-rubric-v3';
        a.submittedAt = new Date().toISOString();
        if (a.policy?.feedbackMode === 'After delay')
          a.feedbackAvailableAt = new Date(
            Date.now() + (a.policy.feedbackDelayHours ?? 24) * 3600000,
          ).toISOString();
        if (
          !a.passed &&
          d.governance &&
          d.attempts.filter(
            (t) => t.assignmentId === a.assignmentId && (t.groupId ?? '') === (a.groupId ?? ''),
          ).length >= (a.policy?.maxAttempts ?? d.settings.maxAttempts) &&
          !d.governance.reviews.some((r) => r.attemptId === a.id)
        ) {
          d.governance.reviews.unshift({
            id: crypto.randomUUID(),
            personId: a.personId,
            assignmentId: a.assignmentId,
            attemptId: a.id,
            kind: 'Remedial review',
            status: 'Open',
            ownerId: assignment.supervisorId ?? '',
            due: londonDate(),
            reason: 'Maximum permitted attempts reached',
            actions: '',
            decision: '',
            resolvedAt: '',
          });
        }
        if (a.groupId) {
          if (d.settings.portalNotifications)
            d.notices.unshift({
              id: crypto.randomUUID(),
              assignmentId: assignment.id,
              personId: a.personId,
              title: survey ? 'Survey completed' : 'Question group result',
              text:
                (a.groupTitle || 'Checkpoint') +
                ': ' +
                (survey ? 'Completed' : a.passed ? 'Passed' : 'Not passed') +
                '. Continue your course learning.',
              at: a.submittedAt,
              key: a.id,
            });
          return null;
        }
        if (
          a.passed &&
          course.evidenceType &&
          course.evidenceType !== 'Internal knowledge completion'
        ) {
          assignment.completedAt = a.submittedAt;
          return null;
        }
        if (a.passed && !d.certificates.some((c) => c.assignmentId === assignment.id)) {
          assignment.completedAt = a.submittedAt;
          const award = a.award ?? {
            cpdHours: course.cpdHours,
            validityMonths: course.validityMonths ?? d.settings.validityMonths,
            sample: course.sample,
            branding: d.settings,
            issuer:
              course.issuer?.trim() ||
              d.settings.issuer.trim() ||
              this.store.company()?.name ||
              'CareVerity',
            learner: this.store.staff().find((p) => p.id === a.personId)!.name,
          };
          const months = award.validityMonths;
          const certificate: AcademyCertificate = {
            id: 'CV-' + crypto.randomUUID(),
            templateVersion: 1,
            passedAttemptId: a.id,
            courseCode: course.code,
            personId: a.personId,
            assignmentId: assignment.id,
            courseId: course.id,
            courseTitle: a.courseTitle,
            courseVersion: a.courseVersion,
            learner: award.learner,
            issuer: award.issuer,
            issuedAt: a.submittedAt,
            expires: months ? addMonths(londonDate(new Date(a.submittedAt)), months) : '',
            score: a.score!,
            cpdHours: award.cpdHours,
            sample: award.sample,
            branding: structuredClone(award.branding),
          };
          d.certificates.push(certificate);
          d.completions ??= [];
          d.completions.push({
            id: a.resultId!,
            tenantId: workspace,
            personId: a.personId,
            assignmentId: assignment.id,
            attemptId: a.id,
            courseVersion: a.courseVersion,
            correlationId: a.correlationId!,
            status: 'CERTIFICATE_PENDING',
            createdAt: a.submittedAt,
            updatedAt: a.submittedAt,
            retryCount: 0,
            error: 'Certificate generation and HR filing are queued in the seeded workflow.',
            acknowledgements: [],
          });
          if (d.settings.portalNotifications)
            d.notices.unshift({
              id: crypto.randomUUID(),
              assignmentId: assignment.id,
              personId: a.personId,
              title: 'Completion recorded · evidence pending',
              text: this.template(
                'Your result for {{course}} is recorded. Certificate and HR filing are pending.',
                course.title,
                certificate.expires,
              ),
              at: a.submittedAt,
              key: certificate.id,
            });
        }
        if (d.settings.portalNotifications)
          d.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId: assignment.id,
            personId: a.personId,
            title: 'Assessment result',
            text: this.template(d.settings.notificationTemplates.result, a.courseTitle, ''),
            at: a.submittedAt,
            key: a.id,
          });
        return null;
      },
      attempt.personId,
      false,
    );
  }
  recordResourceOpen(assignmentId: string, resourceId: string, workspace: string): string | null {
    const assignment = this.assignment(assignmentId);
    if (!assignment) return 'Assignment unavailable.';
    return this.change(
      workspace,
      'Resource opened',
      resourceId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived);
        if (!a || !this.assignedCourse(a)?.lessons.some((l) => l.handoutIds.includes(resourceId)))
          return 'Resource unavailable.';
        a.openedResourceIds = [...new Set([...(a.openedResourceIds ?? []), resourceId])];
        return null;
      },
      assignment.personId,
      false,
    );
  }
  acknowledgeResource(assignmentId: string, resourceId: string, workspace: string): string | null {
    const assignment = this.assignment(assignmentId);
    if (!assignment) return 'Assignment unavailable.';
    return this.change(
      workspace,
      'Resource acknowledged',
      resourceId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived);
        if (!a || !this.assignedCourse(a)?.lessons.some((l) => l.handoutIds.includes(resourceId)))
          return 'Resource unavailable.';
        if (!a.openedResourceIds?.includes(resourceId))
          return 'Open the resource before acknowledging it.';
        a.resourceAcknowledgements = [
          ...new Set([...(a.resourceAcknowledgements ?? []), resourceId]),
        ];
        return null;
      },
      assignment.personId,
      false,
    );
  }
  revokeCertificate(id: string, reason: string, workspace: string): string | null {
    return this.change(workspace, 'Certificate revoked', id + ' · ' + reason, (d) => {
      const c = d.certificates.find((c) => c.id === id);
      if (!c || !reason.trim()) return 'Select a certificate and record a revocation reason.';
      if (c.revokedAt) return 'This certificate is already revoked.';
      c.revokedAt = new Date().toISOString();
      c.revocationReason = reason.trim();
      d.refresherSchedules?.forEach((schedule) => {
        if (
          d.completions?.some(
            (job) => job.id === schedule.completionId && job.assignmentId === c.assignmentId,
          )
        )
          schedule.cancelledAt = c.revokedAt;
      });
      const completion = d.completions?.find((v) => v.assignmentId === c.assignmentId);
      if (completion) {
        completion.status = 'SYNC_EXCEPTION';
        completion.error =
          'Evidence revoked; current training and rota checks exclude it. History retained: ' +
          reason.trim();
        completion.updatedAt = c.revokedAt;
      }
      return null;
    });
  }
  private retakeSource(
    d: AcademyData,
    attemptId: string,
  ): { attempt: AcademyAttempt; assignment: AcademyAssignment; earliest: number } | string {
    const attempt = d.attempts.find((a) => a.id === attemptId);
    if (
      !attempt?.submittedAt ||
      attempt.invalidatedAt ||
      attempt.passed ||
      attempt.groupKind === 'Survey'
    )
      return 'Choose a submitted, failed assessment.';
    const assignment = d.assignments.find(
      (a) =>
        a.id === attempt.assignmentId &&
        a.personId === attempt.personId &&
        !a.archived &&
        !a.completedAt,
    );
    if (!assignment) return 'This learning cycle is complete or archived.';
    const groupId = attempt.groupId ?? '';
    const history = d.attempts.filter(
      (a) => a.assignmentId === assignment.id && (a.groupId ?? '') === groupId,
    );
    if (history.some((a) => !a.submittedAt)) return 'A retake is already in progress.';
    const latest = history
      .filter((a) => a.submittedAt)
      .reverse()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    if (latest?.id !== attempt.id || history.some((a) => a.passed))
      return 'This result has been superseded. Review the latest assessment result.';
    const course = assignment.courseSnapshot ?? d.courses.find((c) => c.id === assignment.courseId);
    if (!course) return 'The assigned course is unavailable.';
    const policy = assignment.policySnapshot ?? attempt.policy ?? this.policyFor(course);
    if (history.length >= policy.maxAttempts)
      return 'No attempts remain. Training manager review is required.';
    return {
      attempt,
      assignment,
      earliest: Date.parse(attempt.submittedAt) + policy.retakeWaitHours * 3600000,
    };
  }
  private recordRetakeNotice(d: AcademyData, attempt: AcademyAttempt, scheduledFor: string) {
    const key = 'retake:' + attempt.id + ':' + scheduledFor;
    if (d.notices.some((n) => n.key === key)) return;
    d.notices.unshift({
      id: crypto.randomUUID(),
      assignmentId: attempt.assignmentId,
      personId: attempt.personId,
      title: 'Assessment retake',
      text:
        attempt.courseTitle +
        (attempt.groupTitle ? ' · ' + attempt.groupTitle : '') +
        ': return to your course for a retake available from ' +
        scheduledFor +
        '. The assigned attempt limit and content requirements still apply.',
      at: new Date().toISOString(),
      key,
    });
  }
  scheduleRetake(attemptId: string, scheduledFor: string, workspace: string): string | null {
    return this.change(workspace, 'Assessment retake scheduled', attemptId, (d) => {
      const source = this.retakeSource(d, attemptId);
      if (typeof source === 'string') return source;
      const date = Date.parse(scheduledFor);
      if (!Number.isFinite(date) || date < Date.now() || date < source.earliest)
        return 'Choose a future retake time on or after the assigned minimum waiting period.';
      d.retakePlans ??= [];
      const existing = d.retakePlans.find(
        (p) => p.fromAttemptId === attemptId && !p.startedAttemptId,
      );
      const now = new Date().toISOString();
      const plan: AcademyRetakePlan = {
        id: existing?.id ?? crypto.randomUUID(),
        assignmentId: source.assignment.id,
        personId: source.attempt.personId,
        fromAttemptId: attemptId,
        groupId: source.attempt.groupId ?? '',
        scheduledFor: new Date(date).toISOString(),
        createdAt: existing?.createdAt ?? now,
        createdBy: existing?.createdBy ?? this.auth.currentUser()!.name,
        updatedAt: now,
        notifiedAt: '',
      };
      if (d.settings.portalNotifications) {
        this.recordRetakeNotice(d, source.attempt, plan.scheduledFor);
        plan.notifiedAt = now;
      }
      d.retakePlans = [...d.retakePlans.filter((p) => p.id !== plan.id), plan];
      return null;
    });
  }
  notifyRetake(attemptId: string, workspace: string): string | null {
    return this.change(workspace, 'Retake portal notice recorded', attemptId, (d) => {
      const source = this.retakeSource(d, attemptId);
      if (typeof source === 'string') return source;
      if (!d.settings.portalNotifications)
        return 'Enable portal notifications before recording a learner notice.';
      const plan = d.retakePlans?.find((p) => p.fromAttemptId === attemptId && !p.startedAttemptId);
      this.recordRetakeNotice(
        d,
        source.attempt,
        plan?.scheduledFor ?? new Date(source.earliest).toISOString(),
      );
      if (plan) plan.notifiedAt = new Date().toISOString();
      return null;
    });
  }
  notifyManager(attemptId: string, workspace: string): string | null {
    const attempt = this.attempt(attemptId);
    if (!attempt?.submittedAt) return 'Choose a submitted assessment.';
    return this.change(
      workspace,
      'Learner requested training support',
      attempt.courseTitle,
      (d) => {
        if (!d.notices.some((n) => n.key === 'support:' + attemptId))
          d.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId: attempt.assignmentId,
            personId: attempt.personId,
            title: 'Training support requested',
            text:
              this.auth.currentUser()!.name + ' requested a review of ' + attempt.courseTitle + '.',
            at: new Date().toISOString(),
            key: 'support:' + attemptId,
          });
        return null;
      },
      attempt.personId,
      false,
    );
  }
  generateReminders(workspace: string): string | null {
    return this.change(
      workspace,
      'Reminder schedules checked',
      'Device-local reminder generation',
      (d) => {
        if (!d.settings.portalNotifications) return 'Enable portal notifications first.';
        const today = londonDate();
        const add = (a: AcademyAssignment, title: string, text: string, key: string) => {
          if (!d.notices.some((n) => n.key === key))
            d.notices.unshift({
              id: crypto.randomUUID(),
              assignmentId: a.id,
              personId: a.personId,
              title,
              text,
              at: new Date().toISOString(),
              key,
            });
        };
        d.assignments
          .filter((a) => !a.archived)
          .forEach((a) => {
            const course = d.courses.find((c) => c.id === a.courseId);
            if (!course) return;
            if (!a.completedAt && a.due) {
              const days = Math.round((Date.parse(a.due) - Date.parse(today)) / 86400000);
              if (days <= d.settings.dueSoonDays && days >= -d.settings.overdueDays)
                add(
                  a,
                  days < 0 ? 'Training overdue' : 'Training due soon',
                  this.template(d.settings.notificationTemplates.assigned, course.title, a.due),
                  'due:' + a.id + ':' + today,
                );
            }
            const cert = d.certificates.find((c) => c.assignmentId === a.id);
            if (cert?.expires) {
              const days = Math.round((Date.parse(cert.expires) - Date.parse(today)) / 86400000);
              if (days >= 0 && days <= Math.max(d.settings.reminderDays, d.settings.refresherDays))
                add(
                  a,
                  'Certificate expiry / refresher reminder',
                  this.template(
                    d.settings.notificationTemplates.expiry,
                    course.title,
                    cert.expires,
                  ),
                  'expiry:' + cert.id + ':' + today,
                );
            }
          });
        return null;
      },
    );
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
  recordCertificateAccess(
    id: string,
    mode: 'Preview' | 'Filed PDF',
    workspace: string,
  ): string | null {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen this page.';
    const certificate = this.certificate(id);
    if (!certificate || !this.store.staff().some((p) => p.id === certificate.personId))
      return 'You do not have permission to access this certificate.';
    const event = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: this.auth.currentUser()!.name,
      action: 'Certificate accessed',
      detail: mode + ': ' + id,
      personId: certificate.personId,
    };
    return this.store.saveWorkspace((data) => ({
      ...data,
      academy: { ...this.state(), events: [event, ...this.state().events] },
    }))
      ? null
      : 'Could not record certificate access. Free some browser storage and try again.';
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
