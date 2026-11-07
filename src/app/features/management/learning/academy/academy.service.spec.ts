import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../core/auth/fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { londonDate, addDays } from '../../rota/rota.models';
import { AcademyService } from './academy.service';
import { addMonths, gradeAttempt, questionCorrect } from './academy.models';
import { AcademyDate } from './academy-date';
import { AcademyAssignmentPlan } from './academy.models';
import { staffRecord } from '../../people/hr.models';

describe('Academy learning records', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  let personId: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    personId = store.staff()[0].id;
    actor.set({ ...DEMO_USER, roleCode: 'CA', email: store.staff()[0].email });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => ({ ...p, learning: [], progress: {} })),
    }));
    academy = TestBed.inject(AcademyService);
  });
  afterEach(() => vi.restoreAllMocks());
  function assign() {
    const course = academy.state().courses[0];
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 7),
        12,
        'Welcome',
        true,
        false,
        'lqcs',
      ),
    ).toBeNull();
    return {
      course,
      assignment: academy
        .assignments()
        .find((a) => a.personId === personId && a.courseId === course.id && !a.archived)!,
    };
  }
  function ready() {
    const { course, assignment } = assign();
    course.lessons.forEach((l) =>
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull(),
    );
    return { course, assignment: academy.assignment(assignment.id)! };
  }
  it('assigns atomically, synchronises the existing staff learning list and avoids duplicate active assignments', () => {
    const { course, assignment } = assign();
    expect(store.staff().find((p) => p.id === personId)?.learning).toContain(course.id);
    expect(academy.state().notices[0].personId).toBe(personId);
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 10),
        0,
        '',
        false,
        false,
        'lqcs',
      ),
    ).toBeNull();
    expect(
      academy
        .assignments()
        .filter((a) => a.personId === personId && a.courseId === course.id && !a.archived),
    ).toHaveLength(1);
    expect(academy.assignment(assignment.id)?.due).toBe(addDays(londonDate(), 10));
    const before = JSON.stringify(store.data());
    expect(
      academy.assign([personId, 'missing'], [course.id], londonDate(), 0, '', false, false, 'lqcs'),
    ).toContain('current staff');
    expect(JSON.stringify(store.data())).toBe(before);
  });
  it('requires the learner’s own account and enforces sequential lessons and assessment prerequisites', () => {
    const { course, assignment } = assign();
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('Complete all lessons');
    expect(
      academy.saveLesson(assignment.id, course.lessons[1].id, null, null, true, 'lqcs'),
    ).toContain('earlier lessons');
    actor.update((a) => ({ ...a, roleCode: 'CW', email: 'other@example.test' }));
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toContain('unavailable');
    expect(
      academy.assign([personId], [course.id], londonDate(), 0, '', false, false, 'lqcs'),
    ).toContain('permission');
  });
  it('issues one immutable certificate only after a pass and preserves verified HR training', () => {
    const verified = structuredClone(store.staff().find((p) => p.id === personId)?.hr?.training);
    const { course, assignment } = ready();
    expect(academy.state().certificates).toHaveLength(0);
    const start = academy.startAttempt(assignment.id, 'lqcs');
    expect(start.error).toBeNull();
    const attempt = academy.attempt(start.id)!;
    const q = attempt.questions[0];
    expect(academy.answer(attempt.id, q.id, q.correctIds, null, 'lqcs')).toBeNull();
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    expect(academy.attempt(attempt.id)?.score).toBe(100);
    expect(academy.state().certificates).toHaveLength(1);
    const certificate = structuredClone(academy.state().certificates[0]);
    expect(certificate.courseTitle).toBe(course.title);
    expect(certificate.personId).toBe(personId);
    expect(store.staff().find((p) => p.id === personId)?.progress[course.id]).toBe(100);
    expect(store.staff().find((p) => p.id === personId)?.hr?.training).toEqual(verified);
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    expect(academy.state().certificates).toHaveLength(1);
    const settings = structuredClone(academy.state().settings);
    settings.primary = '#ff0000';
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    expect(academy.state().certificates[0]).toEqual(certificate);
  });
  it('continues a saved attempt, snapshots question order and rejects changes to submitted answers', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const before = structuredClone(academy.attempt(id)!);
    const question = structuredClone(before.questions[0]);
    question.text = 'A revised published question';
    expect(academy.saveQuestion(question, 'lqcs', question.updatedAt)).toBeNull();
    expect(academy.attempt(id)?.questions).toEqual(before.questions);
    expect(academy.startAttempt(assignment.id, 'lqcs').id).toBe(id);
    expect(academy.answer(id, question.id, question.correctIds, null, 'lqcs')).toBeNull();
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.answer(id, question.id, [], null, 'lqcs')).toContain('submitted');
  });
  it('locks expired attempts, grades unanswered questions as incorrect and enforces the attempt cap', () => {
    const settings = structuredClone(academy.state().settings);
    settings.maxAttempts = 1;
    settings.timeLimitMinutes = 1;
    academy.saveSettings(settings, 'lqcs', settings.updatedAt);
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const a = academy.attempt(id)!;
    expect(academy.submit(id, 'lqcs')).toContain('required');
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(a.deadline) + 1000);
    expect(
      academy.answer(id, a.questions[0].id, a.questions[0].correctIds, null, 'lqcs'),
    ).toContain('expired');
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.attempt(id)?.score).toBe(0);
    expect(academy.state().certificates).toHaveLength(0);
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('No attempts');
  });
  it('saves draft course and question revisions without replacing published content', () => {
    const course = structuredClone(academy.state().courses[0]);
    const original = structuredClone(course);
    course.status = 'Draft';
    course.title = 'Unpublished course revision';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(academy.state().courses.find((c) => c.id === course.id)).toEqual(original);
    expect(academy.editableCourses().find((c) => c.id === course.id)?.title).toBe(course.title);
    const q = structuredClone(academy.state().questions[0]);
    const text = q.text;
    q.status = 'Draft';
    q.text = 'An unfinished question';
    q.correctIds = [];
    q.options[0].text = '';
    expect(academy.saveQuestion(q, 'lqcs', q.updatedAt)).toBeNull();
    expect(academy.state().questions[0].text).toBe(text);
    expect(academy.editableQuestions().find((v) => v.id === q.id)?.text).toBe(q.text);
  });
  it('retains answers when persistence fails and isolates all operations by workspace', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    expect(academy.answer(id, q.id, q.correctIds, null, 'other')).toContain('workspace changed');
    const before = JSON.stringify(academy.state());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(academy.answer(id, q.id, q.correctIds, null, 'lqcs')).toContain('Could not save');
    expect(JSON.stringify(academy.state())).toBe(before);
    spy.mockRestore();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(academy.attempt(id)).toBeUndefined();
    expect(academy.state().certificates).toHaveLength(0);
    expect(academy.saveSettings(academy.state().settings, 'lqcs', '')).toContain(
      'workspace changed',
    );
  });
  it('creates a new assignment cycle only when renewal is explicitly requested', () => {
    const { course, assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    academy.answer(id, q.id, q.correctIds, null, 'lqcs');
    academy.submit(id, 'lqcs');
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 30),
        12,
        '',
        true,
        true,
        'lqcs',
      ),
    ).toBeNull();
    expect(academy.state().assignments.find((a) => a.id === assignment.id)?.archived).toBe(true);
    const active = academy
      .assignments()
      .find((a) => a.personId === personId && a.courseId === course.id && !a.archived)!;
    expect(active.id).not.toBe(assignment.id);
    expect(active.completedLessonIds).toEqual([]);
    expect(active.completedAt).toBe('');
    expect(academy.state().certificates).toHaveLength(1);
  });
  it('suppresses duplicate scheduled reminders and reports real recorded dates', () => {
    assign();
    expect(academy.generateReminders('lqcs')).toBeNull();
    const notices = academy.state().notices.length;
    expect(academy.generateReminders('lqcs')).toBeNull();
    expect(academy.state().notices).toHaveLength(notices);
    expect(academy.state().events[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('retains certificate award rules from the started attempt when settings change', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const attempt = academy.attempt(id)!;
    const old = structuredClone(attempt.award!);
    const settings = structuredClone(academy.state().settings);
    settings.primary = '#AA0000';
    settings.validityMonths = 24;
    settings.issuer = 'Changed issuer';
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    academy.answer(id, attempt.questions[0].id, attempt.questions[0].correctIds, null, 'lqcs');
    expect(academy.submit(id, 'lqcs')).toBeNull();
    const c = academy.state().certificates[0];
    expect(c.branding).toEqual(old.branding);
    expect(c.issuer).toBe(old.issuer);
    expect(c.cpdHours).toBe(old.cpdHours);
    expect(c.expires).toBe(addMonths(londonDate(new Date(c.issuedAt)), old.validityMonths));
  });
  it('keeps lesson notes private to their owner and validates their length and media position', () => {
    const { assignment, course } = assign();
    const lesson = course.lessons[0];
    expect(
      academy.saveLesson(assignment.id, lesson.id, 'Personal reflection', 10, false, 'lqcs'),
    ).toBeNull();
    expect(academy.assignment(assignment.id)?.notes[lesson.id]).toBe('Personal reflection');
    expect(
      academy.saveLesson(assignment.id, lesson.id, 'x'.repeat(1001), null, false, 'lqcs'),
    ).toContain('1000');
    expect(academy.saveLesson(assignment.id, lesson.id, null, -10, false, 'lqcs')).toContain(
      'position',
    );
    actor.update((a) => ({
      ...a,
      email: store.staff().find((p) => p.id !== personId)!.email,
      roleCode: 'CW',
    }));
    expect(academy.assignment(assignment.id)).toBeUndefined();
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('unavailable');
  });
  it('allows self-enrolment only for the signed-in learner and published optional courses', () => {
    const settings = structuredClone(academy.state().settings);
    settings.allowSelfEnrolment = true;
    academy.saveSettings(settings, 'lqcs', settings.updatedAt);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const optional = academy.state().courses.find((c) => !c.mandatory)!;
    expect(academy.enrol(optional.id, 'lqcs')).toBeNull();
    expect(
      academy.assignments().find((a) => a.personId === personId && a.courseId === optional.id),
    ).toBeDefined();
    expect(academy.enrol(academy.state().courses.find((c) => c.mandatory)!.id, 'lqcs')).toContain(
      'not available',
    );
    expect(academy.enrol(optional.id, 'lqcs')).toContain('already enrolled');
  });
  it('rejects stale editor saves and prevents deleting an asset used by a certificate or attempt snapshot', () => {
    const settings = structuredClone(academy.state().settings);
    expect(
      academy.saveSettings({ ...settings, passMark: 80 }, 'lqcs', settings.updatedAt),
    ).toBeNull();
    expect(
      academy.saveSettings({ ...settings, passMark: 90 }, 'lqcs', settings.updatedAt),
    ).toContain('changed');
    expect(
      academy.saveAsset(
        {
          id: 'logo',
          name: 'Logo',
          mime: 'image/png',
          size: 10,
          kind: 'Image',
          at: '',
          by: 'Admin',
        },
        'lqcs',
      ),
    ).toBeNull();
    const next = structuredClone(academy.state().settings);
    next.logoId = 'logo';
    academy.saveSettings(next, 'lqcs', next.updatedAt);
    expect(academy.removeAsset('logo', 'lqcs')).toContain('in use');
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const newer = structuredClone(academy.state().settings);
    newer.logoId = '';
    academy.saveSettings(newer, 'lqcs', newer.updatedAt);
    expect(academy.removeAsset('logo', 'lqcs')).toContain('in use');
    expect(academy.attempt(id)?.award?.branding.logoId).toBe('logo');
  });
  it('handles multiple answers, weighted marking, calendar-month expiry and UK local time', () => {
    const q = structuredClone(academy.state().questions[0]);
    q.type = 'Multiple choice';
    q.correctIds = q.options.slice(0, 2).map((o) => o.id);
    expect(questionCorrect(q, [...q.correctIds].reverse())).toBe(true);
    expect(questionCorrect(q, [q.correctIds[0]])).toBe(false);
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(new AcademyDate().transform('2026-07-01T12:00:00Z', 'd MMM yyyy, HH:mm')).toContain(
      '13:00',
    );
  });
  it('fails a critical question even at 90 percent and never creates completion evidence', () => {
    const course = academy.state().courses[0];
    const template = academy.state().questions[0];
    store.update((d) => ({
      ...d,
      academy: {
        ...academy.state(),
        questions: Array.from({ length: 10 }, (_, i) => ({
          ...structuredClone(template),
          id: 'critical-' + i,
          critical: i === 0,
        })),
      },
    }));
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const attempt = academy.attempt(id)!;
    for (const q of attempt.questions)
      academy.answer(
        id,
        q.id,
        q.critical ? [q.options.find((o) => !q.correctIds.includes(o.id))!.id] : q.correctIds,
        null,
        'lqcs',
      );
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.attempt(id)?.score).toBe(90);
    expect(academy.attempt(id)?.criticalFailed).toBe(true);
    expect(academy.attempt(id)?.passed).toBe(false);
    expect(academy.state().certificates).toHaveLength(0);
    expect(academy.state().completions ?? []).toHaveLength(0);
  });
  it('keeps a pass separate from unacknowledged HR, matrix and rota integration', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    academy.answer(id, q.id, q.correctIds, null, 'lqcs');
    expect(academy.submit(id, 'lqcs')).toBeNull();
    const completion = academy.completion(assignment.id)!;
    expect(completion.status).toBe('CERTIFICATE_PENDING');
    expect(completion.tenantId).toBe('lqcs');
    expect(completion.personId).toBe(personId);
    expect(completion.acknowledgements).toEqual([]);
    expect(academy.status(academy.assignment(assignment.id)!)).toContain('evidence pending');
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.state().completions).toHaveLength(1);
  });
  it('blocks publication when a required uploaded resource has not passed server processing', () => {
    const course = structuredClone(academy.state().courses[0]);
    expect(
      academy.saveAsset(
        {
          id: 'pending-pdf',
          name: 'Policy.pdf',
          mime: 'application/pdf',
          size: 100,
          kind: 'Document',
          status: 'SCAN_PENDING',
          at: '',
          by: 'Manager',
        },
        'lqcs',
      ),
    ).toBeNull();
    course.lessons[0].handoutIds = ['pending-pdf'];
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toContain('READY');
    expect(academy.state().courses.find((c) => c.id === course.id)?.lessons[0].handoutIds).toEqual(
      [],
    );
  });
  it('requires an open event and explicit resource read acknowledgement before completing a gated lesson', () => {
    const { assignment, course } = assign();
    store.update((d) => ({
      ...d,
      academy: {
        ...academy.state(),
        assignments: academy.state().assignments.map((a) =>
          a.id === assignment.id
            ? {
                ...a,
                courseSnapshot: {
                  ...course,
                  lessons: course.lessons.map((l, i) =>
                    i === 0
                      ? {
                          ...l,
                          handoutIds: ['required-resource', 'optional-resource'],
                          optionalHandoutIds: ['optional-resource'],
                          requireResourceAck: true,
                        }
                      : l,
                  ),
                },
              }
            : a,
        ),
      },
    }));
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toContain('acknowledge');
    expect(academy.acknowledgeResource(assignment.id, 'required-resource', 'lqcs')).toContain(
      'Open',
    );
    expect(academy.recordResourceOpen(assignment.id, 'required-resource', 'lqcs')).toBeNull();
    expect(academy.acknowledgeResource(assignment.id, 'required-resource', 'lqcs')).toBeNull();
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
  });
  it('retains the assigned course and question version after republishing', () => {
    const { assignment, course } = assign();
    const old = structuredClone(academy.assignedCourse(assignment)!);
    const q = structuredClone(academy.state().questions[0]);
    q.text = 'New question version';
    academy.saveQuestion(q, 'lqcs', q.updatedAt);
    const next = structuredClone(course);
    next.title = 'New published title';
    next.lessons.reverse();
    expect(academy.saveCourse(next, 'lqcs', next.updatedAt)).toBeNull();
    expect(academy.assignedCourse(academy.assignment(assignment.id)!)).toEqual(old);
    old.lessons.forEach((l) =>
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull(),
    );
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    expect(academy.attempt(id)?.courseVersion).toBe(old.version);
    expect(academy.attempt(id)?.questions[0].text).not.toBe('New question version');
  });
  function failedRetake(maxAttempts = 3, retakeWaitHours = 24) {
    const course = structuredClone(academy.state().courses[0]);
    course.policy = { ...academy.policyFor(course), maxAttempts, retakeWaitHours };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const { assignment } = ready();
    const attempt = academy.startAttempt(assignment.id, 'lqcs');
    expect(attempt.error).toBeNull();
    const question = academy.attempt(attempt.id)!.questions[0];
    expect(
      academy.answer(
        attempt.id,
        question.id,
        [question.options.find((o) => !question.correctIds.includes(o.id))!.id],
        null,
        'lqcs',
      ),
    ).toBeNull();
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    return {
      assignment: academy.assignment(assignment.id)!,
      attempt: academy.attempt(attempt.id)!,
    };
  }
  it('schedules an exact failed-result retake without resetting its policy and records one portal notice per schedule', () => {
    const { assignment, attempt } = failedRetake();
    const frozenQuestions = structuredClone(assignment.questionSnapshot);
    const earliest = Date.parse(attempt.submittedAt) + 24 * 3600000;
    const scheduled = new Date(earliest + 2 * 3600000).toISOString();
    expect(
      academy.scheduleRetake(attempt.id, new Date(earliest - 1000).toISOString(), 'lqcs'),
    ).toContain('minimum waiting period');
    expect(academy.scheduleRetake(attempt.id, scheduled, 'lqcs')).toBeNull();
    expect(academy.scheduleRetake(attempt.id, scheduled, 'lqcs')).toBeNull();
    expect(academy.notifyRetake(attempt.id, 'lqcs')).toBeNull();
    expect(academy.notifyRetake(attempt.id, 'lqcs')).toBeNull();
    expect(academy.state().retakePlans).toHaveLength(1);
    expect(academy.state().retakePlans![0]).toMatchObject({
      personId: assignment.personId,
      assignmentId: assignment.id,
      fromAttemptId: attempt.id,
      groupId: '',
      scheduledFor: scheduled,
    });
    expect(academy.state().notices.filter((n) => n.key.startsWith('retake:'))).toHaveLength(1);
    expect(academy.assignment(assignment.id)?.questionSnapshot).toEqual(frozenQuestions);
    expect(academy.assignment(assignment.id)?.policySnapshot?.maxAttempts).toBe(3);
    expect(
      academy.assessmentAvailability(academy.assignment(assignment.id)!, earliest + 3600000),
    ).toMatchObject({ reason: 'Retake scheduled for a later date.', readyAt: scheduled });
    const before = JSON.stringify(academy.state());
    expect(academy.scheduleRetake(attempt.id, scheduled, 'riverside')).toContain('workspace');
    actor.update((a) => ({ ...a, roleCode: 'QA' }));
    expect(academy.scheduleRetake(attempt.id, scheduled, 'lqcs')).toContain('permission');
    expect(academy.notifyRetake(attempt.id, 'lqcs')).toContain('permission');
    expect(JSON.stringify(academy.state())).toBe(before);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(scheduled) + 1000);
    const retake = academy.startAttempt(assignment.id, 'lqcs');
    expect(retake.error).toBeNull();
    expect(academy.state().retakePlans![0].startedAttemptId).toBe(retake.id);
    expect(academy.startAttempt(assignment.id, 'lqcs').id).toBe(retake.id);
    expect(academy.attempt(retake.id)?.questions.map((q) => q.id)).toEqual(
      frozenQuestions!.filter((q) => !q.groupId || q.groupId === 'final').map((q) => q.id),
    );
  });
  it('rejects scheduling when a retake is running or a newer pass has completed the learning cycle', () => {
    const { assignment, attempt } = failedRetake(2, 0);
    const retake = academy.startAttempt(assignment.id, 'lqcs');
    expect(retake.error).toBeNull();
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(academy.scheduleRetake(attempt.id, future, 'lqcs')).toContain('already in progress');
    const next = academy.attempt(retake.id)!;
    for (const q of next.questions) academy.answer(next.id, q.id, q.correctIds, null, 'lqcs');
    expect(academy.submit(next.id, 'lqcs')).toBeNull();
    expect(academy.scheduleRetake(attempt.id, future, 'lqcs')).toContain('complete or archived');
    expect(academy.scheduleRetake(next.id, future, 'lqcs')).toContain('failed assessment');
    expect(academy.state().retakePlans ?? []).toHaveLength(0);
  });
  it('requires manager review at the attempt cap and never creates a schedule or retake notice', () => {
    const { attempt } = failedRetake(1, 0);
    expect(
      academy.scheduleRetake(attempt.id, new Date(Date.now() + 3600000).toISOString(), 'lqcs'),
    ).toContain('No attempts remain');
    expect(academy.notifyRetake(attempt.id, 'lqcs')).toContain('No attempts remain');
    expect(academy.state().retakePlans ?? []).toHaveLength(0);
    expect(academy.state().notices.filter((n) => n.key.startsWith('retake:'))).toHaveLength(0);
    expect(new AcademyDate().transform('2026-07-01T12:00:10Z', 'HH:mm:ss')).toBe('13:00:10');
  });
  it('enforces the frozen retake wait even after settings change', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.policy = {
      maxAttempts: 3,
      retakeWaitHours: 24,
      timeLimitMinutes: 30,
      showFeedback: true,
    };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(
      academy.assign([personId], [course.id], addDays(londonDate(), 7), 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    expect(academy.assignment(assignment.id)?.policySnapshot?.retakeWaitHours).toBe(24);
    expect(academy.attempt(id)?.policy?.retakeWaitHours).toBe(24);
    const q = academy.attempt(id)!.questions[0];
    academy.answer(
      id,
      q.id,
      [q.options.find((o) => !q.correctIds.includes(o.id))!.id],
      null,
      'lqcs',
    );
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('Retake available after');
    vi.spyOn(Date, 'now').mockReturnValue(
      Date.parse(academy.attempt(id)!.submittedAt) + 24 * 3600000,
    );
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toBeNull();
  });
  it('denies learner certificate access and management even if a configuration includes worker roles', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    academy.answer(id, q.id, q.correctIds, null, 'lqcs');
    academy.submit(id, 'lqcs');
    const certificate = academy.state().certificates[0];
    store.update((d) => ({
      ...d,
      academy: {
        ...academy.state(),
        settings: { ...academy.state().settings, adminRoles: ['CW', 'CC'] },
      },
    }));
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.canManage()).toBe(false);
    expect(academy.certificate(certificate.id)).toBeUndefined();
    expect(academy.attempt(id)?.passed).toBe(true);
    expect(academy.revokeCertificate(certificate.id, 'Incorrect record', 'lqcs')).toContain(
      'permission',
    );
    actor.update((a) => ({ ...a, roleCode: 'CC' }));
    expect(academy.canReadCertificate()).toBe(false);
  });
  it('preserves original results on revocation and invalidates current evidence', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    academy.answer(id, q.id, q.correctIds, null, 'lqcs');
    academy.submit(id, 'lqcs');
    const certificate = academy.state().certificates[0];
    expect(academy.revokeCertificate(certificate.id, '', 'lqcs')).toContain('reason');
    expect(academy.revokeCertificate(certificate.id, 'Wrong approved content', 'lqcs')).toBeNull();
    expect(academy.attempt(id)?.passed).toBe(true);
    expect(academy.certificate(certificate.id)?.revocationReason).toBe('Wrong approved content');
    expect(academy.completion(assignment.id)?.status).toBe('SYNC_EXCEPTION');
    expect(academy.status(academy.assignment(assignment.id)!)).toBe('Evidence review');
    expect(academy.revokeCertificate(certificate.id, 'Again', 'lqcs')).toContain('already revoked');
  });
  it('does not round a sub-threshold weighted score into a pass', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const attempt = structuredClone(academy.attempt(id)!);
    attempt.questions = Array.from({ length: 201 }, (_, i) => ({
      ...attempt.questions[0],
      id: 'weighted-' + i,
    }));
    attempt.answers = Object.fromEntries(
      attempt.questions.slice(0, 160).map((q) => [q.id, q.correctIds]),
    );
    expect(gradeAttempt(attempt)).toBeLessThan(80);
    expect(Math.round(gradeAttempt(attempt))).toBe(80);
  });
  it('freezes the assigned pass threshold and sequence even before the learner starts', () => {
    const { assignment, course } = assign();
    const original = academy.state().settings.passMark;
    const settings = structuredClone(academy.state().settings);
    settings.passMark = 95;
    settings.sequentialLessons = false;
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    expect(
      academy.saveLesson(assignment.id, course.lessons[1].id, null, null, true, 'lqcs'),
    ).toContain('earlier lessons');
    course.lessons.forEach((l) =>
      academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs'),
    );
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    expect(academy.attempt(id)?.passMark).toBe(original);
  });
  it('does not count seeking or repeated video ranges as watched content', () => {
    const { assignment, course } = assign();
    const lesson = course.lessons[0];
    store.update((d) => ({
      ...d,
      academy: {
        ...academy.state(),
        assignments: academy.state().assignments.map((a) =>
          a.id === assignment.id
            ? {
                ...a,
                courseSnapshot: {
                  ...academy.assignedCourse(a)!,
                  lessons: course.lessons.map((l) =>
                    l.id === lesson.id ? { ...l, videoId: 'video-test', watchThreshold: 90 } : l,
                  ),
                },
              }
            : a,
        ),
      },
    }));
    expect(academy.recordVideoProgress(assignment.id, lesson.id, 0, 60, 60, 1, 'lqcs')).toBeNull();
    expect(academy.watchedPercent(academy.assignment(assignment.id)!, lesson.id)).toBe(0);
    expect(academy.saveLesson(assignment.id, lesson.id, null, null, true, 'lqcs')).toContain(
      'Watch',
    );
    for (let start = 0; start < 54; start += 6)
      expect(
        academy.recordVideoProgress(assignment.id, lesson.id, start, start + 6, 60, 6, 'lqcs'),
      ).toBeNull();
    expect(academy.watchedPercent(academy.assignment(assignment.id)!, lesson.id)).toBe(90);
    academy.recordVideoProgress(assignment.id, lesson.id, 0, 6, 60, 6, 'lqcs');
    expect(academy.watchedPercent(academy.assignment(assignment.id)!, lesson.id)).toBe(90);
    expect(academy.saveLesson(assignment.id, lesson.id, null, null, true, 'lqcs')).toBeNull();
  });
  it('redacts answer keys and feedback from learner attempt projections until feedback release', () => {
    const { assignment } = ready();
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const q = academy.attempt(id)!.questions[0];
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.attempt(id)?.questions[0].correctIds).toEqual([]);
    expect(academy.attempt(id)?.questions[0].explanation).toBe('');
    expect(
      academy.assignedCourse(academy.assignment(assignment.id)!)?.assessmentQuestions,
    ).toBeUndefined();
    expect(academy.answer(id, q.id, q.correctIds, null, 'lqcs')).toBeNull();
    expect(academy.submit(id, 'lqcs')).toBeNull();
    expect(academy.attempt(id)?.passed).toBe(true);
    expect(academy.attempt(id)?.questions[0].correctIds).toEqual(q.correctIds);
  });
  it('records worker access requests once and permits only management to acknowledge them', () => {
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.requestTrainingRecords('other')).toContain('workspace');
    expect(academy.requestTrainingRecords('lqcs')).toBeNull();
    const request = academy.state().accessRequests![0];
    expect(request.personId).toBe(personId);
    expect(request.tenantId).toBe('lqcs');
    expect(academy.requestTrainingRecords('lqcs')).toContain('already');
    expect(academy.acknowledgeRecordsRequest(request.id, 'lqcs')).toContain('permission');
    actor.update((a) => ({ ...a, roleCode: 'HR' }));
    expect(academy.acknowledgeRecordsRequest(request.id, 'lqcs')).toBeNull();
    expect(academy.state().accessRequests![0].status).toBe('Acknowledged');
    expect(academy.state().accessRequests![0].acknowledgedBy).toBe(actor().name);
  });
  it('denies unassigned course content and ambiguous staff identity matches', () => {
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === personId ? { ...p, learning: [] } : p)),
      academy: { ...academy.state(), assignments: [] },
    }));
    const courseId = academy.state().courses[0].id;
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.course(courseId)).toBeUndefined();
    expect(academy.me()?.id).toBe(personId);
    const another = store.staff().find((p) => p.id !== personId)!;
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === another.id ? { ...p, email: actor().email } : p)),
    }));
    expect(academy.me()).toBeUndefined();
    expect(academy.requestTrainingRecords('lqcs')).toContain('not linked');
  });
  it('provides read-only evidence access for quality reviewers without granting course editing', () => {
    actor.update((a) => ({ ...a, roleCode: 'QA' }));
    expect(academy.canViewEvidence()).toBe(true);
    expect(academy.canManage()).toBe(false);
    expect(academy.saveCourse(academy.state().courses[0], 'lqcs', '')).toContain('permission');
    actor.update((a) => ({ ...a, roleCode: 'CC' }));
    expect(academy.canViewEvidence()).toBe(false);
  });
  it('prevents new assignments to an inactive published course while preserving existing learner progress', () => {
    const { assignment, course } = assign();
    const changed = structuredClone(course);
    changed.active = false;
    expect(academy.saveCourse(changed, 'lqcs', changed.updatedAt)).toBeNull();
    expect(
      academy.assign([personId], [course.id], londonDate(), 0, '', false, true, 'lqcs'),
    ).toContain('published courses');
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
    expect(academy.assignment(assignment.id)?.courseVersion).toBe(course.version);
  });
  it('enforces pinned module prerequisites even when sequential lesson order is disabled', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [
      { id: 'intro', title: 'Introduction' },
      { id: 'practice', title: 'Safe Practice', prerequisiteModuleIds: ['intro'] },
    ];
    course.lessons.forEach((l, i) => {
      l.moduleId = i === 0 ? 'intro' : 'practice';
      l.moduleTitle = i === 0 ? 'Introduction' : 'Safe Practice';
    });
    course.policy = { ...academy.policyFor(course), sequentialLessons: false };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const { assignment } = assign();
    expect(academy.lessonBlock(assignment, course.lessons[1].id)).toContain('prerequisite modules');
    expect(
      academy.saveLesson(assignment.id, course.lessons[1].id, null, null, true, 'lqcs'),
    ).toContain('prerequisite modules');
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
    expect(academy.lessonBlock(academy.assignment(assignment.id)!, course.lessons[1].id)).toBe('');
    expect(
      academy.assignedCourse(academy.assignment(assignment.id)!)?.modules?.[1]
        .prerequisiteModuleIds,
    ).toEqual(['intro']);
  });
  it('retains unused upload reviews, protects their assets and blocks publication until every video is placed or deleted', () => {
    const course = structuredClone(academy.state().courses[0]);
    for (const [id, kind, mime] of [
      ['unused-video', 'Video', 'video/mp4'],
      ['unused-caption', 'Captions', 'text/vtt'],
      ['unused-document', 'Document', 'application/pdf'],
    ] as const) {
      expect(
        academy.saveAsset(
          {
            id,
            name: id,
            kind,
            mime,
            size: 100,
            at: '',
            by: 'Manager',
            status: kind === 'Video' ? 'CAPTIONS_REVIEW' : 'READY',
          },
          'lqcs',
        ),
      ).toBeNull();
    }
    const video = {
      ...structuredClone(course.lessons[0]),
      id: 'unused-video-lesson',
      moduleId: '',
      moduleTitle: '',
      type: 'Video' as const,
      videoId: 'unused-video',
      captionId: 'unused-caption',
      transcript: 'Reviewed transcript.',
      handoutIds: [],
    };
    const resource = {
      ...structuredClone(video),
      id: 'unused-document-lesson',
      type: 'Reading' as const,
      videoId: '',
      captionId: '',
      transcript: '',
      handoutIds: ['unused-document'],
    };
    course.pendingLessons = [video, resource];
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(academy.removeAsset('unused-video', 'lqcs')).toContain('in use');
    expect(academy.removeAsset('unused-document', 'lqcs')).toContain('in use');
    expect(academy.approveDemoVideo(course.id, video.id, 'lqcs')).toBeNull();
    expect(academy.state().assets.find((a) => a.id === 'unused-video')?.status).toBe('READY');
    const draft = structuredClone(academy.course(course.id)!);
    draft.status = 'Published';
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toContain('every unused video');
    expect(academy.state().courses.find((c) => c.id === course.id)?.pendingLessons).toBeUndefined();
    draft.pendingLessons = [resource];
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toBeNull();
    const { assignment } = assign();
    expect(assignment.courseSnapshot?.pendingLessons).toBeUndefined();
    expect(
      academy
        .state()
        .courseVersions?.filter((c) => c.id === course.id)
        .every((c) => c.pendingLessons === undefined),
    ).toBe(true);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.assetReadable('unused-document')).toBe(false);
  });
  it('rejects cyclic module prerequisites, detached lessons and publication with empty modules', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [
      { id: 'intro', title: 'Introduction', prerequisiteModuleIds: ['practice'] },
      { id: 'practice', title: 'Safe Practice' },
    ];
    course.lessons.forEach((l) => {
      l.moduleId = 'intro';
      l.moduleTitle = 'Introduction';
    });
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toContain(
      'prerequisite modules first',
    );
    course.modules[0].prerequisiteModuleIds = [];
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toContain('every module');
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const draft = structuredClone(academy.course(course.id)!);
    draft.lessons[0].moduleId = 'missing';
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toContain('assign every lesson');
  });
  function publishCheckpointCourse() {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [
      { id: 'intro', title: 'Introduction' },
      { id: 'practice', title: 'Safe Practice' },
    ];
    course.lessons.forEach((l, i) => {
      l.moduleId = i === 0 ? 'intro' : 'practice';
      l.moduleTitle = i === 0 ? 'Introduction' : 'Safe Practice';
    });
    course.questionGroups = [
      {
        id: 'intro-check',
        title: 'Introduction checkpoint',
        placement: 'After module',
        moduleId: 'intro',
        lessonId: '',
        availableAfterDays: 0,
        dueAfterDays: 7,
        required: true,
      },
    ];
    course.policy = { ...academy.policyFor(course), sequentialLessons: false };
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const question = structuredClone(
      academy.state().questions.find((q) => q.courseId === course.id)!,
    );
    Object.assign(question, {
      id: 'checkpoint-question',
      groupId: 'intro-check',
      lessonId: course.lessons[0].id,
      updatedAt: '',
      version: 0,
      status: 'Published',
    });
    expect(academy.saveQuestion(question, 'lqcs')).toBeNull();
    const draft = structuredClone(academy.course(course.id)!);
    draft.status = 'Published';
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toBeNull();
    return assign();
  }
  it('gates later modules on their question group and awards only the final course assessment', () => {
    const { course, assignment } = publishCheckpointCourse();
    expect(academy.startAttempt(assignment.id, 'lqcs', 'intro-check').error).toContain(
      'required lessons',
    );
    expect(academy.lessonBlock(assignment, course.lessons[1].id)).toContain(
      'Introduction checkpoint',
    );
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
    const checkpoint = academy.startAttempt(assignment.id, 'lqcs', 'intro-check');
    expect(checkpoint.error).toBeNull();
    const attempt = academy.state().attempts.find((a) => a.id === checkpoint.id)!;
    expect(attempt.questions.map((q) => q.id)).toEqual(['checkpoint-question']);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.attempt(attempt.id)?.questions[0].correctIds).toEqual([]);
    actor.update((a) => ({ ...a, roleCode: 'CA' }));
    expect(
      academy.answer(
        attempt.id,
        attempt.questions[0].id,
        attempt.questions[0].correctIds,
        null,
        'lqcs',
      ),
    ).toBeNull();
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    expect(academy.assignment(assignment.id)?.completedAt).toBe('');
    expect(academy.state().certificates.some((c) => c.assignmentId === assignment.id)).toBe(false);
    expect(academy.state().completions?.some((j) => j.assignmentId === assignment.id)).toBe(false);
    expect(academy.assessmentAvailability(academy.assignment(assignment.id)!).remaining).toBe(3);
    expect(academy.lessonBlock(academy.assignment(assignment.id)!, course.lessons[1].id)).toBe('');
    for (const lesson of course.lessons.slice(1))
      expect(academy.saveLesson(assignment.id, lesson.id, null, null, true, 'lqcs')).toBeNull();
    const final = academy.startAttempt(assignment.id, 'lqcs');
    expect(final.error).toBeNull();
    const finalAttempt = academy.state().attempts.find((a) => a.id === final.id)!;
    expect(finalAttempt.questions.every((q) => !q.groupId || q.groupId === 'final')).toBe(true);
    for (const q of finalAttempt.questions)
      academy.answer(final.id, q.id, q.correctIds, null, 'lqcs');
    expect(academy.submit(final.id, 'lqcs')).toBeNull();
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    expect(
      academy.state().certificates.filter((c) => c.assignmentId === assignment.id),
    ).toHaveLength(1);
    expect(
      academy.state().completions?.filter((j) => j.assignmentId === assignment.id),
    ).toHaveLength(1);
    expect(
      academy.state().certificates.find((c) => c.assignmentId === assignment.id)?.passedAttemptId,
    ).toBe(final.id);
  });
  function publishGradedGroups(critical = false) {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [
      { id: 'first', title: 'Module 1' },
      { id: 'second', title: 'Module 2' },
    ];
    course.lessons.forEach((l, i) => {
      l.moduleId = i === 0 ? 'first' : 'second';
      l.moduleTitle = i === 0 ? 'Module 1' : 'Module 2';
    });
    course.passMark = 80;
    const group = {
      placement: 'After module' as const,
      moduleId: 'first',
      lessonId: '',
      availableAfterDays: 0,
      dueAfterDays: null,
      required: false,
    };
    course.questionGroups = [
      { ...group, id: 'counted', title: 'Module 1 quiz', kind: 'Quiz', countsTowardGrade: true },
      { ...group, id: 'practice', title: 'Practice quiz', kind: 'Quiz', countsTowardGrade: false },
      {
        ...group,
        id: 'survey',
        title: 'Module feedback',
        kind: 'Survey',
        countsTowardGrade: false,
        placement: 'Within module',
        lessonId: course.lessons[0].id,
        required: true,
      },
    ];
    course.policy = { ...academy.policyFor(course), retakeWaitHours: 0, sequentialLessons: false };
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const original = structuredClone(
      academy.state().questions.find((q) => q.courseId === course.id)!,
    );
    original.weight = 4;
    expect(academy.saveQuestion(original, 'lqcs', original.updatedAt)).toBeNull();
    for (const id of ['counted', 'practice', 'survey']) {
      const q = {
        ...structuredClone(original),
        id: 'q-' + id,
        groupId: id,
        weight: id === 'practice' ? 10 : 1,
        updatedAt: '',
        version: 0,
        critical: id === 'counted' && critical,
      };
      if (id === 'survey')
        Object.assign(q, {
          type: 'Free text',
          text: 'How could we improve this module?',
          correctIds: [],
          options: [],
          explanation: '',
        });
      expect(academy.saveQuestion(q, 'lqcs')).toBeNull();
    }
    const draft = structuredClone(academy.course(course.id)!);
    draft.status = 'Published';
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toBeNull();
    return assign();
  }
  function respond(id: string, correct: boolean) {
    const attempt = academy.state().attempts.find((a) => a.id === id)!;
    for (const q of attempt.questions) {
      const answer =
        q.type === 'Free text'
          ? ['More practical examples, please.']
          : correct
            ? q.correctIds
            : [q.options.find((o) => !q.correctIds.includes(o.id))!.id];
      expect(academy.answer(id, q.id, answer, null, 'lqcs')).toBeNull();
    }
    expect(academy.submit(id, 'lqcs')).toBeNull();
  }
  function finishSurvey(assignmentId: string, firstLesson: string) {
    expect(academy.saveLesson(assignmentId, firstLesson, null, null, true, 'lqcs')).toBeNull();
    const survey = academy.startAttempt(assignmentId, 'lqcs', 'survey');
    expect(survey.error).toBeNull();
    respond(survey.id, false);
    return survey.id;
  }
  it('requires survey responses without grading them and combines only counted quiz marks into the course grade', () => {
    const { course, assignment } = publishGradedGroups();
    expect(academy.startAttempt(assignment.id, 'lqcs', 'survey').error).toContain(
      'required lessons',
    );
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
    expect(academy.lessonBlock(academy.assignment(assignment.id)!, course.lessons[1].id)).toContain(
      'Complete the required survey',
    );
    const survey = academy.startAttempt(assignment.id, 'lqcs', 'survey');
    expect(survey.error).toBeNull();
    expect(academy.attempt(survey.id)?.policy?.timeLimitMinutes).toBe(0);
    expect(academy.submit(survey.id, 'lqcs')).toContain('required questions');
    expect(academy.answer(survey.id, 'q-survey', ['x'.repeat(4001)], null, 'lqcs')).toContain(
      'valid answer',
    );
    respond(survey.id, false);
    expect(academy.attempt(survey.id)).toMatchObject({
      score: null,
      passed: true,
      groupKind: 'Survey',
      gradeBreakdown: [],
    });
    expect(academy.state().certificates).toHaveLength(0);
    expect(
      academy.assessmentAvailability(academy.assignment(assignment.id)!, Date.now(), 'survey')
        .reason,
    ).toBe('Survey completed.');
    for (const l of course.lessons.slice(1))
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull();
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('count toward');
    const practice = academy.startAttempt(assignment.id, 'lqcs', 'practice');
    respond(practice.id, false);
    const quiz = academy.startAttempt(assignment.id, 'lqcs', 'counted');
    respond(quiz.id, false);
    const final = academy.startAttempt(assignment.id, 'lqcs');
    expect(final.error).toBeNull();
    respond(final.id, true);
    const result = academy.attempt(final.id)!;
    expect(result).toMatchObject({ score: 80, sectionScore: 100, passed: true });
    expect(result.gradeBreakdown?.map((g) => [g.groupId, g.earned, g.available])).toEqual([
      ['', 4, 4],
      ['counted', 0, 1],
    ]);
    expect(academy.state().certificates[0].score).toBe(80);
    expect(academy.state().certificates).toHaveLength(1);
  });
  it('freezes contributing attempts at final start and carries critical failures from counted quizzes into the final pass decision', () => {
    const { course, assignment } = publishGradedGroups(true);
    finishSurvey(assignment.id, course.lessons[0].id);
    for (const l of course.lessons.slice(1))
      academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs');
    const first = academy.startAttempt(assignment.id, 'lqcs', 'counted');
    respond(first.id, false);
    const final = academy.startAttempt(assignment.id, 'lqcs');
    expect(final.error).toBeNull();
    const retake = academy.startAttempt(assignment.id, 'lqcs', 'counted');
    expect(retake.error).toBeNull();
    respond(retake.id, true);
    respond(final.id, true);
    expect(academy.attempt(final.id)).toMatchObject({
      score: 80,
      passed: false,
      criticalFailed: true,
      contributingAttemptIds: [first.id],
    });
    expect(academy.state().certificates).toHaveLength(0);
    const finalRetake = academy.startAttempt(assignment.id, 'lqcs');
    expect(finalRetake.error).toBeNull();
    respond(finalRetake.id, true);
    expect(academy.attempt(finalRetake.id)).toMatchObject({
      score: 100,
      passed: true,
      criticalFailed: false,
      contributingAttemptIds: [retake.id],
    });
    expect(academy.state().certificates).toHaveLength(1);
  });
  it('keeps assigned grading and placement frozen and rejects graded surveys or misplaced free text questions', () => {
    const { course, assignment } = publishGradedGroups();
    const draft = structuredClone(academy.course(course.id)!);
    draft.status = 'Draft';
    draft.questionGroups![0].countsTowardGrade = false;
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toBeNull();
    expect(
      academy.assignedCourse(academy.assignment(assignment.id)!)?.questionGroups?.[0]
        .countsTowardGrade,
    ).toBe(true);
    let edited = structuredClone(academy.course(course.id)!);
    edited.questionGroups![2].countsTowardGrade = true;
    expect(academy.saveCourse(edited, 'lqcs', edited.updatedAt)).toContain('Surveys cannot count');
    edited = structuredClone(academy.course(course.id)!);
    edited.questionGroups![2].moduleId = 'second';
    expect(academy.saveCourse(edited, 'lqcs', edited.updatedAt)).toContain(
      'module/lesson placement',
    );
    const q = structuredClone(academy.editableQuestions().find((q) => q.id === 'q-survey')!);
    q.groupId = '';
    expect(academy.saveQuestion(q, 'lqcs', q.updatedAt)).toContain('survey group');
    const survey = structuredClone(academy.editableQuestions().find((q) => q.id === 'q-survey')!);
    survey.critical = true;
    expect(academy.saveQuestion(survey, 'lqcs', survey.updatedAt)).toContain(
      'critical pass conditions',
    );
  });
  it('keeps scheduled checkpoint dates and group membership frozen for assigned staff', () => {
    const { assignment } = publishCheckpointCourse();
    const course = structuredClone(academy.course(assignment.courseId)!);
    course.questionGroups![0] = {
      ...course.questionGroups![0],
      placement: 'Scheduled',
      availableAfterDays: 5,
      dueAfterDays: 7,
    };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 7),
        12,
        '',
        false,
        true,
        'lqcs',
      ),
    ).toBeNull();
    const scheduled = academy
      .assignments()
      .find((a) => a.personId === personId && a.courseId === course.id && !a.archived)!;
    const assigned = Date.parse(scheduled.assignedAt);
    expect(
      academy.assessmentAvailability(scheduled, assigned + 4 * 86400000, 'intro-check').reason,
    ).toContain('scheduled date');
    expect(
      academy.assessmentAvailability(scheduled, assigned + 5 * 86400000, 'intro-check').reason,
    ).toBe('');
    expect(
      academy.assessmentAvailability(scheduled, assigned + 8 * 86400000, 'intro-check').dueAt,
    ).toBe(new Date(assigned + 7 * 86400000).toISOString());
    const edit = structuredClone(academy.course(course.id)!);
    edit.status = 'Draft';
    edit.questionGroups![0].availableAfterDays = 100;
    edit.questionGroups![0].dueAfterDays = 101;
    expect(academy.saveCourse(edit, 'lqcs', edit.updatedAt)).toBeNull();
    expect(
      academy.assessmentAvailability(scheduled, assigned + 5 * 86400000, 'intro-check').reason,
    ).toBe('');
    expect(academy.assignedCourse(scheduled)?.questionGroups?.[0].availableAfterDays).toBe(5);
  });
  it('saves a question bank atomically and retains published answers when any item is invalid or stale', () => {
    const course = academy.state().courses[0];
    const questions = structuredClone(
      academy.editableQuestions().filter((q) => q.courseId === course.id),
    );
    const original = structuredClone(questions[0]);
    questions[0].text = 'A revised question awaiting review';
    questions[0].status = 'Draft';
    questions.push({
      ...structuredClone(original),
      id: 'invalid-bank-question',
      text: '',
      status: 'Draft',
      updatedAt: '',
      version: 0,
    });
    expect(academy.saveQuestionBank(course.id, questions, [], course.updatedAt, 'lqcs')).toContain(
      'Complete the question',
    );
    expect(academy.editableQuestions().find((q) => q.id === original.id)).toEqual(original);
    questions.pop();
    const external = structuredClone(original);
    external.text = 'Changed by another editor';
    expect(academy.saveQuestion(external, 'lqcs', external.updatedAt)).toBeNull();
    expect(academy.saveQuestionBank(course.id, questions, [], course.updatedAt, 'lqcs')).toContain(
      'changed',
    );
    expect(academy.editableQuestions().find((q) => q.id === original.id)?.text).toBe(
      'Changed by another editor',
    );
  });
  it('offers a before-module checkpoint before content and scopes failed-attempt limits to that group', () => {
    const initial = publishCheckpointCourse();
    const course = structuredClone(academy.course(initial.course.id)!);
    course.questionGroups![0].placement = 'Before module';
    course.policy = { ...academy.policyFor(course), maxAttempts: 1, retakeWaitHours: 0 };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(
      academy.assign([personId], [course.id], addDays(londonDate(), 7), 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === personId && a.courseId === course.id && !a.archived)!;
    expect(academy.lessonBlock(assignment, course.lessons[0].id)).toContain(
      'required question group',
    );
    const start = academy.startAttempt(assignment.id, 'lqcs', 'intro-check');
    expect(start.error).toBeNull();
    const question = academy.state().attempts.find((a) => a.id === start.id)!.questions[0];
    const wrong = question.options.find((o) => !question.correctIds.includes(o.id))!.id;
    academy.answer(start.id, question.id, [wrong], null, 'lqcs');
    expect(academy.submit(start.id, 'lqcs')).toBeNull();
    expect(academy.startAttempt(assignment.id, 'lqcs', 'intro-check').error).toContain(
      'No attempts',
    );
    expect(academy.assessmentAvailability(assignment).remaining).toBe(1);
    expect(academy.state().certificates.some((c) => c.assignmentId === assignment.id)).toBe(false);
  });
  function rulesCandidate(target = personId) {
    const course = structuredClone(academy.course(academy.state().courses[0].id)!);
    course.passMark = 90;
    course.policy = {
      ...academy.policyFor(course),
      maxAttempts: 2,
      timeLimitMinutes: 15,
      retakeWaitHours: 6,
    };
    const plan: AcademyAssignmentPlan = {
      method: 'Individual Worker',
      roles: [],
      team: 'All',
      personIds: [target],
      priority: 'High',
      due: addDays(londonDate(), 14),
      refresher: false,
      channels: ['Email', 'App', 'In-platform'],
      recurrenceMonths: 12,
      message: 'Please complete the assigned training.',
    };
    course.assignmentPlan = plan;
    return course;
  }
  it('publishes reviewed rules and assigns their frozen policy and notification requests to the canonical worker', () => {
    const { assignment: original } = assign();
    const target = store
      .staff()
      .find(
        (p) =>
          p.id !== personId &&
          !['Inactive', 'Left'].includes(p.hr?.status ?? '') &&
          !['Inactive', 'Left', 'Leaver', 'Terminated'].includes(p.stage),
      )!;
    const course = rulesCandidate(target.id);
    expect(academy.saveRulesAndAssign(course, [target.id], course.updatedAt, 'lqcs')).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === target.id && a.courseId === course.id && !a.archived)!;
    expect(assignment.source).toBe('Individual Worker');
    expect(assignment.priority).toBe('High');
    expect(assignment.policySnapshot).toMatchObject({
      maxAttempts: 2,
      timeLimitMinutes: 15,
      retakeWaitHours: 6,
    });
    expect(assignment.courseSnapshot?.passMark).toBe(90);
    expect(assignment.courseSnapshot?.assignmentPlan).toBeUndefined();
    expect(assignment.notificationRequests?.map((r) => [r.channel, r.status])).toEqual([
      ['Email', 'Not configured'],
      ['App', 'Recorded'],
      ['In-platform', 'Recorded'],
    ]);
    expect(academy.state().notices.filter((n) => n.assignmentId === assignment.id)).toHaveLength(1);
    expect(academy.assignment(original.id)?.policySnapshot?.maxAttempts).toBe(3);
    actor.update((a) => ({ ...a, roleCode: 'CW', email: target.email }));
    expect(academy.course(course.id)?.assignmentPlan).toBeUndefined();
    expect(academy.assignedCourse(assignment)?.assignmentPlan).toBeUndefined();
  });
  it('rolls back course publication when assignment fails and rejects stale reviewed versions', () => {
    const course = rulesCandidate();
    course.active = false;
    const before = structuredClone(academy.state());
    expect(academy.saveRulesAndAssign(course, [personId], course.updatedAt, 'lqcs')).toContain(
      'published courses',
    );
    expect(academy.state()).toEqual(before);
    course.active = true;
    const edit = structuredClone(academy.course(course.id)!);
    edit.status = 'Draft';
    edit.description += ' Reviewed elsewhere.';
    expect(academy.saveCourse(edit, 'lqcs', edit.updatedAt)).toBeNull();
    expect(academy.saveRulesAndAssign(course, [personId], course.updatedAt, 'lqcs')).toContain(
      'changed',
    );
    expect(academy.state().courses.find((c) => c.id === course.id)?.passMark).not.toBe(90);
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 14),
        0,
        '',
        false,
        false,
        'lqcs',
        { expectedCourseUpdatedAt: 'stale-version' },
      ),
    ).toContain('changed');
  });
  it('uses canonical team/role targeting, excludes inactive workers and preserves exact HR profile context', () => {
    const current = store
      .staff()
      .filter(
        (p) =>
          !['Inactive', 'Left'].includes(p.hr?.status ?? '') &&
          !['Inactive', 'Left', 'Leaver', 'Terminated'].includes(p.stage),
      )
      .slice(0, 3);
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => {
        const index = current.findIndex((v) => v.id === p.id);
        if (index < 0) return p;
        const hr = staffRecord(p);
        return {
          ...p,
          role: 'Care Worker',
          hr: {
            ...hr,
            status: index === 2 ? 'Inactive' : 'Active',
            employment: { ...hr.employment, department: 'Academy Target Group' },
          },
        };
      }),
    }));
    const course = rulesCandidate(current[0].id);
    course.targetRoles = ['Care Worker'];
    const plan = course.assignmentPlan!;
    plan.method = 'By Role';
    plan.roles = ['Care Worker'];
    plan.team = 'Academy Target Group';
    expect(
      academy
        .assignmentTargets(course, plan)
        .map((p) => p.id)
        .sort(),
    ).toEqual(
      current
        .slice(0, 2)
        .map((p) => p.id)
        .sort(),
    );
    plan.method = 'By Team';
    plan.roles = [];
    expect(
      academy
        .assignmentTargets(course, plan)
        .map((p) => p.id)
        .sort(),
    ).toEqual(
      current
        .slice(0, 2)
        .map((p) => p.id)
        .sort(),
    );
    plan.method = 'From HR Staff Profile';
    plan.personIds = [current[0].id];
    expect(academy.saveRulesAndAssign(course, [current[1].id], course.updatedAt, 'lqcs')).toContain(
      'reviewed assignment plan',
    );
    expect(
      academy.saveRulesAndAssign(course, [current[0].id], course.updatedAt, 'lqcs'),
    ).toBeNull();
    expect(
      academy
        .assignments()
        .filter((a) => a.courseId === course.id && !a.archived)
        .map((a) => a.personId),
    ).toEqual([current[0].id]);
  });
  it('checks publication without mutating drafts, history, assignments or audit events', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const draft = structuredClone(academy.course(course.id)!);
    const before = structuredClone(academy.state());
    expect(academy.publicationError(draft, draft.updatedAt, 'lqcs')).toBeNull();
    expect(academy.publicationError(draft, draft.updatedAt, 'lqcs')).toBeNull();
    expect(academy.state()).toEqual(before);
    draft.lessons[0].videoId = 'missing-publication-video';
    const error = academy.publicationError(draft, draft.updatedAt, 'lqcs');
    expect(error).toContain('READY');
    expect(academy.saveCourse({ ...draft, status: 'Published' }, 'lqcs', draft.updatedAt)).toBe(
      error,
    );
    expect(academy.state()).toEqual(before);
    expect(academy.publicationError(draft, draft.updatedAt, 'different-workspace')).toContain(
      'workspace',
    );
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.publicationError(draft, draft.updatedAt, 'lqcs')).toContain('permission');
  });
  it('retains published content and records the publishing actor while freezing inherited assessment rules', () => {
    const { course, assignment } = assign();
    const next = structuredClone(course);
    next.title += ' — Reviewed version';
    next.publicationNote = 'Reviewed publication and answer key';
    next.assignmentPlan = rulesCandidate().assignmentPlan;
    expect(academy.saveCourse(next, 'lqcs', next.updatedAt)).toBeNull();
    const published = academy.state().courses.find((c) => c.id === course.id)!;
    expect(published.publishedBy).toBe(actor().name);
    expect(Number.isFinite(Date.parse(published.publishedAt!))).toBe(true);
    const history = academy.state().courseVersions!.filter((c) => c.id === course.id);
    expect(history.map((c) => c.version)).toEqual([course.version, published.version]);
    expect(history.find((c) => c.version === course.version)?.title).toBe(course.title);
    expect(history.every((c) => c.assignmentPlan === undefined)).toBe(true);
    expect(
      history.find((c) => c.version === published.version)?.assessmentQuestions?.length,
    ).toBeGreaterThan(0);
    expect(academy.assignedCourse(academy.assignment(assignment.id)!)?.title).toBe(course.title);
    const threshold = published.passMark;
    const settings = {
      ...academy.state().settings,
      passMark: 95,
      maxAttempts: 1,
      timeLimitMinutes: 5,
    };
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    expect(academy.state().courses.find((c) => c.id === course.id)?.passMark).toBe(threshold);
    expect(
      academy.assign([personId], [course.id], addDays(londonDate(), 7), 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const renewal = academy
      .assignments()
      .find((a) => a.personId === personId && a.courseId === course.id && !a.archived)!;
    expect(renewal.courseSnapshot?.passMark).toBe(threshold);
    expect(renewal.policySnapshot?.maxAttempts).toBe(published.policy?.maxAttempts);
    expect(renewal.policySnapshot?.timeLimitMinutes).toBe(published.policy?.timeLimitMinutes);
    expect(
      academy
        .state()
        .courseVersions?.find((c) => c.id === course.id && c.version === published.version)
        ?.publicationNote,
    ).toBe('Reviewed publication and answer key');
  });
  it('publishes future availability without allowing early assignment or optional enrolment', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.effectiveDate = addDays(londonDate(), 5);
    course.mandatory = false;
    const settings = { ...academy.state().settings, allowSelfEnrolment: true };
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    expect(academy.publicationError(course, course.updatedAt, 'lqcs')).toBeNull();
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(
      academy.assign(
        [personId],
        [course.id],
        addDays(londonDate(), 10),
        0,
        '',
        false,
        false,
        'lqcs',
      ),
    ).toContain('published courses');
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(academy.course(course.id)).toBeUndefined();
    expect(academy.enrol(course.id, 'lqcs')).toContain('not available');
  });
  it('protects media referenced only by retained published versions from deletion', () => {
    const course = structuredClone(academy.state().courses[0]);
    for (const id of [
      'historic-course-image',
      'historic-question-image',
      'unused-publication-image',
    ])
      expect(
        academy.saveAsset(
          {
            id,
            name: id + '.png',
            mime: 'image/png',
            size: 100,
            kind: 'Image',
            status: 'READY',
            at: '',
            by: 'Manager',
          },
          'lqcs',
        ),
      ).toBeNull();
    const q = structuredClone(academy.state().questions.find((q) => q.courseId === course.id)!);
    q.imageId = 'historic-question-image';
    expect(academy.saveQuestion(q, 'lqcs', q.updatedAt)).toBeNull();
    course.thumbnailId = 'historic-course-image';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const replacement = structuredClone(academy.state().questions.find((v) => v.id === q.id)!);
    replacement.imageId = '';
    expect(academy.saveQuestion(replacement, 'lqcs', replacement.updatedAt)).toBeNull();
    const current = structuredClone(academy.course(course.id)!);
    current.thumbnailId = '';
    expect(academy.saveCourse(current, 'lqcs', current.updatedAt)).toBeNull();
    expect(academy.removeAsset('historic-course-image', 'lqcs')).toContain('in use');
    expect(academy.removeAsset('historic-question-image', 'lqcs')).toContain('in use');
    expect(academy.removeAsset('unused-publication-image', 'lqcs')).toBeNull();
  });
});
