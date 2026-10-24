import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { ROLES } from '../../../../core/auth/models/role';
import { ManagementStore } from '../../shared/management.store';
import { validDate } from '../../care/care.models';
import { londonDate } from '../../rota/rota.models';
import {
  AcademyData,
  AcademySettings,
  AcademyCourse,
  AcademyQuestion,
  AcademyAssignment,
  AcademyAttempt,
  AcademyAsset,
  AcademyCertificate,
  emptyAcademy,
  legacyAssignment,
  gradeAttempt,
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
    () => !!this.auth.currentUser() && !!this.store.company()?.modules.includes('Training academy'),
  );
  readonly canManage = computed(() => {
    const user = this.auth.currentUser();
    if (!user || !this.enabled()) return false;
    const permission =
      this.store.data().permissions[ROLES[user.roleCode].label + ':Training academy'];
    return (
      ['PO', 'CA'].includes(user.roleCode) ||
      (this.state().settings.adminRoles.includes(user.roleCode) &&
        (!permission || (!!permission[0] && !!permission[1] && !!permission[2])))
    );
  });
  readonly me = computed(() =>
    this.store
      .staff()
      .find((p) => p.email.toLowerCase() === this.auth.currentUser()?.email.toLowerCase()),
  );
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
    return this.enabled() && (this.canManage() || this.owns(personId));
  }
  course(id: string) {
    return (
      this.canManage()
        ? this.editableCourses()
        : this.state().courses.filter((c) => c.status === 'Published')
    ).find((c) => c.id === id);
  }
  assignment(id: string) {
    return this.assignments().find(
      (a) => a.id === id && !a.archived && this.canReadPerson(a.personId),
    );
  }
  attempt(id: string) {
    return this.state().attempts.find((a) => a.id === id && this.canReadPerson(a.personId));
  }
  certificate(id: string) {
    return this.state().certificates.find((c) => c.id === id && this.canReadPerson(c.personId));
  }
  status(a: AcademyAssignment) {
    const certificate = this.state().certificates.find((c) => c.assignmentId === a.id);
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
    if (!this.enabled() || (admin ? !this.canManage() : !this.owns(personId)))
      return 'You do not have permission for this action.';
    const previous = this.assignments();
    const draft = structuredClone({ ...this.state(), assignments: previous });
    const error = apply(draft);
    if (error) return error;
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
  saveCourse(course: AcademyCourse, workspace: string, expected = ''): string | null {
    return this.change(workspace, 'Course saved', course.id + ' · ' + course.title, (d) => {
      const old =
        d.courseDrafts.find((c) => c.id === course.id) ?? d.courses.find((c) => c.id === course.id);
      if (old && old.updatedAt !== expected) return 'This course changed. Reload before saving.';
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
      const media = [
        course.thumbnailId,
        ...course.lessons.flatMap((l) => [l.videoId, l.thumbnailId, l.captionId, ...l.handoutIds]),
      ].filter(Boolean);
      if (media.some((id) => !d.assets.some((a) => a.id === id)))
        return 'A referenced media asset is no longer available.';
      const correctKind = (id: string, kind: string) =>
        !id || d.assets.some((a) => a.id === id && a.kind === kind);
      if (
        !correctKind(course.thumbnailId, 'Image') ||
        course.lessons.some(
          (l) =>
            !correctKind(l.videoId, 'Video') ||
            !correctKind(l.thumbnailId, 'Image') ||
            !correctKind(l.captionId, 'Captions') ||
            l.handoutIds.some((id) => !correctKind(id, 'Document')),
        )
      )
        return 'Choose matching video, image, caption and document assets.';
      const saved = {
        ...structuredClone(course),
        title: course.title.trim(),
        version: (old?.version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      d.courseDrafts = d.courseDrafts.filter((c) => c.id !== course.id);
      if (course.status === 'Draft') d.courseDrafts.push(saved);
      else d.courses = [...d.courses.filter((c) => c.id !== course.id), saved];
      return null;
    });
  }
  saveQuestion(question: AcademyQuestion, workspace: string, expected = ''): string | null {
    return this.change(
      workspace,
      'Question saved',
      question.id + ' · ' + question.text.slice(0, 120),
      (d) => {
        const old =
          d.questionDrafts.find((q) => q.id === question.id) ??
          d.questions.find((q) => q.id === question.id);
        if (old && old.updatedAt !== expected)
          return 'This question changed. Reload before saving.';
        const course =
          d.courseDrafts.find((c) => c.id === question.courseId) ??
          d.courses.find((c) => c.id === question.courseId);
        if (!course || !course.lessons.some((l) => l.id === question.lessonId))
          return 'Choose a course and one of its lessons.';
        if (
          !question.text.trim() ||
          question.text.length > 2000 ||
          !question.category.trim() ||
          !['Single choice', 'Multiple choice', 'True / false'].includes(question.type) ||
          !['Easy', 'Medium', 'Hard'].includes(question.difficulty) ||
          !['Draft', 'Published', 'Archived'].includes(question.status) ||
          !Number.isInteger(question.weight) ||
          question.weight < 1 ||
          question.weight > 10
        )
          return 'Complete the question, category, type, difficulty and marks.';
        if (
          question.status !== 'Draft' &&
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
          (!question.correctIds.length ||
            new Set(question.correctIds).size !== question.correctIds.length ||
            question.correctIds.some((id) => !question.options.some((o) => o.id === id)) ||
            (question.type !== 'Multiple choice' && question.correctIds.length !== 1) ||
            (question.type === 'True / false' && question.options.length !== 2))
        )
          return 'Choose the correct answer or answers for this question type.';
        if (question.status === 'Published' && !question.explanation.trim())
          return 'Add an explanation before publishing.';
        if (
          question.imageId &&
          !d.assets.some((a) => a.id === question.imageId && a.kind === 'Image')
        )
          return 'Choose an available image.';
        const saved = {
          ...structuredClone(question),
          version: (old?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        d.questionDrafts = d.questionDrafts.filter((q) => q.id !== question.id);
        if (question.status === 'Draft') d.questionDrafts.push(saved);
        else d.questions = [...d.questions.filter((q) => q.id !== question.id), saved];
        return null;
      },
    );
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
  ): string | null {
    return this.change(
      workspace,
      'Training assigned',
      `${personIds.length} staff · ${courseIds.length} courses`,
      (d) => {
        if (
          !personIds.length ||
          !courseIds.length ||
          personIds.some((id) => !this.store.staff().some((p) => p.id === id)) ||
          courseIds.some((id) => !d.courses.some((c) => c.id === id && c.status === 'Published')) ||
          !validDate(due) ||
          !Number.isInteger(recurrenceMonths) ||
          recurrenceMonths < 0 ||
          recurrenceMonths > 120
        )
          return 'Choose current staff, published courses, a valid due date and recurrence.';
        for (const personId of new Set(personIds))
          for (const courseId of new Set(courseIds)) {
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
              };
              d.assignments.push(assignment);
            }
            if (notify && d.settings.portalNotifications)
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
        if (!d.settings.allowSelfEnrolment || !course || course.mandatory)
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
        const course = d.courses.find((c) => c.id === a.courseId && c.status === 'Published');
        const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
        if (!course || index < 0) return 'Lesson is unavailable.';
        if (
          d.settings.sequentialLessons &&
          course.lessons.slice(0, index).some((l) => !a.completedLessonIds.includes(l.id))
        )
          return 'Complete the earlier lessons first.';
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
  startAttempt(assignmentId: string, workspace: string): { id: string; error: string | null } {
    if (workspace !== this.store.companyId())
      return { id: '', error: 'The workspace changed. Reopen the assessment.' };
    const assignment = this.assignment(assignmentId);
    if (!assignment) return { id: '', error: 'Assignment unavailable.' };
    const running = this.state().attempts.find(
      (a) => a.assignmentId === assignmentId && !a.submittedAt,
    );
    if (running && this.owns(assignment.personId)) return { id: running.id, error: null };
    const id = crypto.randomUUID();
    const error = this.change(
      workspace,
      'Assessment started',
      assignment.courseId,
      (d) => {
        const a = d.assignments.find((v) => v.id === assignmentId && !v.archived);
        const course = d.courses.find(
          (c) => c.id === assignment.courseId && c.status === 'Published',
        );
        if (
          !a ||
          !course ||
          !course.lessons.length ||
          course.lessons.some((l) => !a.completedLessonIds.includes(l.id))
        )
          return 'Complete all lessons before starting the assessment.';
        if (a.completedAt)
          return 'This assignment is already complete. Ask a manager to assign a refresher.';
        if (
          d.attempts.filter((v) => v.assignmentId === assignmentId).length >= d.settings.maxAttempts
        )
          return 'No attempts remain. Ask your training manager for help.';
        let questions = d.questions.filter(
          (q) => q.courseId === course.id && q.status === 'Published',
        );
        if (!questions.length) return 'No published questions are available.';
        if (d.settings.shuffleQuestions) questions = shuffled(questions);
        questions = structuredClone(questions).map((q) => ({
          ...q,
          options: d.settings.shuffleOptions && q.shuffle ? shuffled(q.options) : q.options,
        }));
        const now = Date.now();
        d.attempts.push({
          award: {
            cpdHours: course.cpdHours,
            validityMonths: course.validityMonths ?? d.settings.validityMonths,
            sample: course.sample,
            branding: structuredClone(d.settings),
            issuer: d.settings.issuer.trim() || this.store.company()?.name || 'CareVerity',
            learner: this.store.staff().find((p) => p.id === a.personId)!.name,
          },
          id,
          assignmentId,
          personId: a.personId,
          courseId: course.id,
          courseTitle: course.title,
          courseVersion: course.version,
          questions,
          answers: {},
          flags: [],
          startedAt: new Date(now).toISOString(),
          deadline: new Date(now + d.settings.timeLimitMinutes * 60000).toISOString(),
          submittedAt: '',
          passMark: course.passMark ?? d.settings.passMark,
          showFeedback: d.settings.showFeedback,
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
          answerIds.some((id) => !q.options.some((o) => o.id === id)) ||
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
        a.score = gradeAttempt(a);
        a.passed = a.score >= a.passMark;
        a.submittedAt = new Date().toISOString();
        const assignment = d.assignments.find((v) => v.id === a.assignmentId && !v.archived);
        const course = d.courses.find((c) => c.id === a.courseId);
        if (!assignment || !course)
          return 'Assignment or course changed. Contact the training manager.';
        if (a.passed && !d.certificates.some((c) => c.assignmentId === assignment.id)) {
          assignment.completedAt = a.submittedAt;
          const award = a.award ?? {
            cpdHours: course.cpdHours,
            validityMonths: course.validityMonths ?? d.settings.validityMonths,
            sample: course.sample,
            branding: d.settings,
            issuer: d.settings.issuer.trim() || this.store.company()?.name || 'CareVerity',
            learner: this.store.staff().find((p) => p.id === a.personId)!.name,
          };
          const months = award.validityMonths;
          const certificate: AcademyCertificate = {
            id: 'CV-' + crypto.randomUUID(),
            personId: a.personId,
            assignmentId: assignment.id,
            courseId: course.id,
            courseTitle: a.courseTitle,
            courseVersion: a.courseVersion,
            learner: award.learner,
            issuer: award.issuer,
            issuedAt: a.submittedAt,
            expires: months ? addMonths(londonDate(new Date(a.submittedAt)), months) : '',
            score: a.score,
            cpdHours: award.cpdHours,
            sample: award.sample,
            branding: structuredClone(award.branding),
          };
          d.certificates.push(certificate);
          if (d.settings.portalNotifications)
            d.notices.unshift({
              id: crypto.randomUUID(),
              assignmentId: assignment.id,
              personId: a.personId,
              title: 'Certificate issued',
              text: this.template(
                d.settings.notificationTemplates.certificate,
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
    return this.change(workspace, 'Training report prepared', kind, () => null);
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
        [...d.courses, ...d.courseDrafts].some(
          (c) =>
            c.thumbnailId === id ||
            c.lessons.some((l) =>
              [l.videoId, l.thumbnailId, l.captionId, ...l.handoutIds].includes(id),
            ),
        ) ||
        [...d.questions, ...d.questionDrafts].some((q) => q.imageId === id) ||
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
      ) ||
      this.state().certificates.some(
        (c) =>
          c.personId === person.id &&
          [c.branding.logoId, c.branding.backgroundId, c.branding.signatureId].includes(id),
      )
    );
  }
}
