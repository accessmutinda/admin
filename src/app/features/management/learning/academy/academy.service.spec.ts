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

describe('Academy learning records', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  let personId: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
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
        .find((a) => a.personId === personId && a.courseId === course.id)!,
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
});
