import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../core/auth/fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { ACADEMY_ADMIN_ROUTES, ACADEMY_STAFF_ROUTES } from './academy.routes';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { londonDate } from '../../rota/rota.models';

describe('Academy administration and staff pages', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/learning', children: ACADEMY_ADMIN_ROUTES },
          { path: 'staff-portal', children: ACADEMY_STAFF_ROUTES },
          {
            path: 'access-denied',
            loadComponent: () =>
              import('../../../auth/access-denied/access-denied').then((m) => m.AccessDenied),
          },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    actor.set({ ...DEMO_USER, roleCode: 'CA', email: store.staff()[0].email });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    academy = TestBed.inject(AcademyService);
  });
  afterEach(() => vi.restoreAllMocks());
  it('opens administration screens and keeps learners out of certificate configuration', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/settings');
    expect(harness.routeNativeElement!.textContent).toContain('CareVerity Academy settings');
    expect(harness.routeNativeElement!.querySelector('cv-academy-certificate')).not.toBeNull();
    for (const route of [
      '',
      'courses',
      'questions',
      'manage',
      'reports',
      'results',
      'certificates',
    ]) {
      await harness.navigateByUrl('/manage/learning' + (route ? '/' + route : ''));
      expect(harness.routeNativeElement!.querySelector('h1')).not.toBeNull();
      expect(harness.routeNativeElement!.querySelector('cv-academy-admin-nav')).not.toBeNull();
    }
    await harness.navigateByUrl('/manage/learning/assets');
    expect(TestBed.inject(Router).url).toBe('/manage/learning/courses');
    expect(harness.routeNativeElement!.querySelector('.asset-grid')).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await harness.navigateByUrl('/manage/learning/settings');
    expect(harness.routeNativeElement!.textContent).toContain('Access');
    expect(harness.routeNativeElement!.querySelector('cv-academy-settings')).toBeNull();
  }, 15000);
  it('persists assessment settings and retains invalid settings drafts', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/settings');
    const page = harness.routeNativeElement!;
    await harness.fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '85';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Save changes')!
      .click();
    harness.detectChanges();
    expect(academy.state().settings.passMark).toBe(85);
    input.value = '120';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Save changes')!
      .click();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('pass mark');
    expect(input.value).toBe('120');
    expect(academy.state().settings.passMark).toBe(85);
  });
  it('does not show locked lesson content on a direct link and permits the assigned learner to complete lessons', async () => {
    const person = academy.me()!;
    const course = academy.state().courses[0];
    academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, false, 'lqcs');
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/courses/' + course.id + '/lessons/' + course.lessons[1].id,
    );
    expect(harness.routeNativeElement!.textContent).toContain('This lesson is locked');
    expect(harness.routeNativeElement!.textContent).not.toContain(course.lessons[1].content);
    await harness.navigateByUrl(
      '/staff-portal/training/courses/' + course.id + '/lessons/' + course.lessons[0].id,
    );
    Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim().endsWith('Mark as complete'))!
      .click();
    harness.detectChanges();
    expect(
      academy.assignments().find((a) => a.personId === person.id && a.courseId === course.id)
        ?.completedLessonIds,
    ).toContain(course.lessons[0].id);
    expect(harness.routeNativeElement!.textContent).toContain('Lesson completed');
  });
  it('shows the reference lesson plan and unlocks learning only after required resources are opened and acknowledged', async () => {
    const original = academy.state().courses[0];
    const course = structuredClone(original);
    course.id = 'reading-reference';
    course.code = 'CVTA-READING';
    course.status = 'Draft';
    course.modules = [{ id: 'reading-module', title: 'Safe practice' }];
    course.lessons = course.lessons.slice(0, 2).map((l, i) => ({
      ...l,
      id: 'reference-lesson-' + i,
      moduleId: 'reading-module',
      moduleTitle: 'Safe practice',
      type: 'Reading' as const,
      content:
        i === 0
          ? 'Read the medication support policy and recording guidance.'
          : 'Apply the guidance in your work.',
      videoId: '',
      captionId: '',
      thumbnailId: '',
      transcript: '',
      handoutIds: i === 0 ? ['reference-policy', 'reference-guide'] : [],
      optionalHandoutIds: [],
      requireResourceAck: true,
    }));
    for (const id of ['reference-policy', 'reference-guide'])
      expect(
        academy.saveAsset(
          {
            id,
            name: id + '.pdf',
            mime: 'application/pdf',
            kind: 'Document',
            size: 100,
            status: 'READY',
            at: '',
            by: 'Manager',
          },
          'lqcs',
        ),
      ).toBeNull();
    expect(academy.saveCourse(course, 'lqcs')).toBeNull();
    const question = {
      ...structuredClone(academy.state().questions.find((q) => q.courseId === original.id)!),
      id: 'reading-reference-question',
      courseId: course.id,
      lessonId: course.lessons[0].id,
      updatedAt: '',
      version: 0,
    };
    expect(academy.saveQuestion(question, 'lqcs')).toBeNull();
    const published = structuredClone(academy.course(course.id)!);
    published.status = 'Published';
    expect(academy.saveCourse(published, 'lqcs', published.updatedAt)).toBeNull();
    const person = academy.me()!;
    expect(
      academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, false, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id)!;
    vi.spyOn(TestBed.inject(AcademyAssets), 'download').mockResolvedValue(undefined);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/courses/' + course.id + '/lessons/' + course.lessons[0].id,
    );
    const page = () => harness.routeNativeElement!;
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    expect(page().querySelector('h1')?.textContent).toContain('Learner Reading');
    expect(page().querySelector('.reading-content')?.textContent).toContain(
      course.lessons[0].content,
    );
    for (const selector of [
      '.lesson-player-card',
      '.lesson-progress',
      '.lesson-outline',
      '.quiz-unlock',
      '.next-lesson-card',
      '.completion-feed',
      '.course-record-notice',
    ])
      expect(page().querySelector(selector)).not.toBeNull();
    expect(page().querySelector('.lesson-resources h2')?.textContent).toContain(
      'Mandatory Resources',
    );
    expect(page().querySelectorAll('.resource-row')).toHaveLength(2);
    expect(page().querySelector('.lesson-progress')?.textContent).toContain('0%');
    const complete = () =>
      page().querySelector<HTMLButtonElement>('.lesson-completion-action button')!;
    expect(complete().disabled).toBe(true);
    expect(page().querySelector<HTMLButtonElement>('.lesson-navigation .primary')!.disabled).toBe(
      true,
    );
    const rows = page().querySelectorAll('.resource-row');
    for (const row of rows) {
      row.querySelector<HTMLButtonElement>('.academy-button')!.click();
      await settle();
      expect(row.querySelector('.resource-state')?.classList.contains('done')).toBe(true);
      expect(complete().disabled).toBe(true);
      row.querySelector<HTMLButtonElement>('.acknowledge-resource')!.click();
      await settle();
    }
    expect(complete().disabled).toBe(false);
    complete().click();
    await settle();
    expect(academy.assignment(assignment.id)?.completedLessonIds).toContain(course.lessons[0].id);
    expect(page().querySelector('.lesson-progress')?.textContent).toContain('50%');
    expect(page().querySelectorAll('.outline-lesson.complete')).toHaveLength(1);
    page().querySelector<HTMLAnchorElement>('.lesson-navigation a.primary')!.click();
    await settle();
    expect(TestBed.inject(Router).url).toContain(course.lessons[1].id);
    complete().click();
    await settle();
    expect(page().querySelector('.lesson-progress')?.textContent).toContain('100%');
    expect(page().querySelector('.quiz-unlock')?.textContent).toContain(
      'final assessment is unlocked',
    );
    expect(academy.state().certificates.some((c) => c.assignmentId === assignment.id)).toBe(false);
  });
  it('uses the reference quiz layout, saves and flags responses, resumes them and submits only complete required answers', async () => {
    const person = academy.me()!,
      course = academy.state().courses[0];
    expect(
      academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, true, 'lqcs'),
    ).toBeNull();
    let assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    for (const lesson of course.lessons)
      expect(academy.saveLesson(assignment.id, lesson.id, null, null, true, 'lqcs')).toBeNull();
    const original = structuredClone(
      academy.state().questions.find((q) => q.courseId === course.id)!,
    );
    const questions = [0, 1, 2].map((i) => ({
      ...structuredClone(original),
      id: 'quiz-reference-' + i,
      text: 'Approved policy question ' + (i + 1),
      required: true,
      type: i === 1 ? ('Multiple choice' as const) : ('Single choice' as const),
      weight: i === 1 ? 2 : 1,
      correctIds: i === 1 ? original.options.slice(0, 2).map((o) => o.id) : original.correctIds,
      explanation: 'Privileged answer rationale must stay hidden until submission.',
    }));
    store.update((data) => ({
      ...data,
      academy: {
        ...academy.state(),
        assignments: academy.state().assignments.map((a) =>
          a.id === assignment.id
            ? {
                ...a,
                questionSnapshot: questions,
                courseSnapshot: { ...a.courseSnapshot!, passMark: 80 },
                policySnapshot: {
                  ...a.policySnapshot!,
                  maxAttempts: 3,
                  timeLimitMinutes: 20,
                  shuffleQuestions: false,
                  shuffleOptions: false,
                },
              }
            : a,
        ),
      },
    }));
    assignment = academy.assignment(assignment.id)!;
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const attempt = academy.startAttempt(assignment.id, 'lqcs');
    expect(attempt.error).toBeNull();
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/assessment/' + attempt.id,
    );
    const page = () => harness.routeNativeElement!;
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    for (const selector of [
      '.quiz-question-card',
      '.quiz-navigator',
      '.quiz-summary',
      '.quiz-rules',
      '.quiz-submit-bar',
    ])
      expect(page().querySelector(selector)).not.toBeNull();
    expect(page().querySelector('h1')?.textContent).toContain('Quiz: Select Answers');
    expect(page().querySelector('.quiz-summary')?.textContent).toContain('4 of 4 marks');
    expect(page().querySelector('.quiz-identity')?.textContent).toContain('Attempt 1 of 3');
    expect(page().querySelector('[role="timer"]')?.textContent).toMatch(/Time remaining: (19|20):/);
    expect(page().textContent).not.toContain(questions[0].explanation);
    expect(page().querySelectorAll('.question-option.correct')).toHaveLength(0);
    const firstCorrect = questions[0].options.findIndex((o) =>
      questions[0].correctIds.includes(o.id),
    );
    page().querySelectorAll<HTMLInputElement>('.question-option input')[firstCorrect].click();
    await settle();
    page().querySelector<HTMLButtonElement>('.flag-question')!.click();
    await settle();
    expect(page().querySelector('.question-nav button.flagged')?.textContent).toContain('1');
    expect(page().querySelector('.completion-percent')?.textContent).toContain('33%');
    vi.spyOn(academy, 'answer').mockReturnValueOnce('Could not save this response.');
    page().querySelector<HTMLButtonElement>('.save-next')!.click();
    await settle();
    expect(page().querySelector('.quiz-question-text')?.textContent).toBe(questions[0].text);
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Could not save');
    page().querySelector<HTMLButtonElement>('.save-next')!.click();
    await settle();
    expect(page().querySelector('.quiz-question-text')?.textContent).toBe(questions[1].text);
    const choices = page().querySelectorAll<HTMLInputElement>('.question-option input');
    choices[0].click();
    await settle();
    choices[1].click();
    await settle();
    expect(page().querySelectorAll('.question-option.selected')).toHaveLength(2);
    page().querySelector<HTMLButtonElement>('.save-next')!.click();
    await settle();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    page().querySelector<HTMLButtonElement>('.submit-assessment')!.click();
    await settle();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('required questions');
    expect(academy.attempt(attempt.id)?.submittedAt).toBe('');
    const lastCorrect = questions[2].options.findIndex((o) =>
      questions[2].correctIds.includes(o.id),
    );
    page().querySelectorAll<HTMLInputElement>('.question-option input')[lastCorrect].click();
    await settle();
    page().querySelector<HTMLButtonElement>('.save-next')!.click();
    await settle();
    page().querySelector<HTMLAnchorElement>('.exit-assessment')!.click();
    await settle();
    await harness.navigateByUrl('/staff-portal/training/assessment/' + attempt.id);
    await settle();
    expect(page().querySelectorAll('.question-nav button.answered')).toHaveLength(3);
    expect(page().querySelectorAll('.question-nav button.flagged')).toHaveLength(1);
    expect(page().querySelector('.completion-percent')?.textContent).toContain('100%');
    expect(
      page().querySelectorAll<HTMLInputElement>('.question-option input')[firstCorrect].checked,
    ).toBe(true);
    page().querySelector<HTMLButtonElement>('.submit-assessment')!.click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/staff-portal/training/results/' + attempt.id);
    expect(academy.attempt(attempt.id)).toMatchObject({ score: 100, passed: true });
  });
  it('shows the reference dashboard sections with stored-data metrics', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toContain(
      'CareVerity Academy',
    );
    expect(harness.routeNativeElement!.textContent).toContain('Integration Health');
    expect(harness.routeNativeElement!.textContent).not.toContain('100% HR');
    expect(harness.routeNativeElement!.querySelectorAll('.metric')).toHaveLength(7);
  });
  it('retains the exact HR staff context for a refresher assignment', async () => {
    const person = store.staff()[0];
    const harness = await RouterTestingHarness.create(
      '/manage/learning/manage?person=' + person.id + '&action=refresher',
    );
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')?.textContent).toContain(
      person.name,
    );
    const selected = harness.routeNativeElement!.querySelectorAll('.drawer details p');
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain(person.name);
  });
  it('carries a learner pass into own history with pending evidence and preserves it through a refresher', async () => {
    const person = academy.me()!;
    const course = academy.state().courses[0];
    academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, true, 'lqcs');
    let assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    course.lessons.forEach((l) =>
      academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs'),
    );
    const question = structuredClone(
      academy.state().questions.find((q) => q.courseId === course.id)!,
    );
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    academy.answer(id, question.id, question.correctIds, null, 'lqcs');
    expect(academy.submit(id, 'lqcs')).toBeNull();
    const harness = await RouterTestingHarness.create('/staff-portal/training/results/' + id);
    expect(harness.routeNativeElement!.textContent).toContain('Assessment passed');
    expect(harness.routeNativeElement!.textContent).toContain('CERTIFICATE_PENDING');
    expect(harness.routeNativeElement!.textContent).not.toContain('Download certificate');
    await harness.navigateByUrl('/staff-portal/training/history');
    expect(harness.routeNativeElement!.textContent).toContain('Passed');
    expect(harness.routeNativeElement!.textContent).toContain('CERTIFICATE_PENDING');
    actor.update((a) => ({ ...a, roleCode: 'HR' }));
    expect(
      academy.assign([person.id], [course.id], '2027-01-31', 0, '', false, true, 'lqcs'),
    ).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Historical cycle');
    expect(harness.routeNativeElement!.textContent).toContain('Refresher');
    expect(academy.attempt(id)?.passed).toBe(true);
    await harness.navigateByUrl('/staff-portal/training/refreshers');
    expect(harness.routeNativeElement!.textContent).toContain(course.title);
  });
  it('keeps forged person queries and unassigned course links outside learner content', async () => {
    const person = academy.me()!;
    const other = store.staff().find((p) => p.id !== person.id)!;
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === person.id ? { ...p, learning: [] } : p)),
      academy: { ...academy.state(), assignments: [] },
    }));
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/history?person=' + other.id,
    );
    expect(harness.routeNativeElement!.textContent).not.toContain(other.name);
    const course = academy.state().courses[0];
    await harness.navigateByUrl('/staff-portal/training/courses/' + course.id);
    expect(harness.routeNativeElement!.textContent).toContain('Course unavailable');
    expect(harness.routeNativeElement!.textContent).not.toContain(course.lessons[0].content);
  });
  it('records a worker request and displays HR acknowledgement without claiming disclosure', async () => {
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create('/staff-portal/training/history');
    Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Request access to my training records'))!
      .click();
    harness.detectChanges();
    expect(academy.state().accessRequests).toHaveLength(1);
    expect(harness.routeNativeElement!.textContent).toContain('awaiting HR');
    actor.update((a) => ({ ...a, roleCode: 'HR' }));
    await harness.navigateByUrl('/manage/learning/certificates');
    Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Acknowledge for HR review'))!
      .click();
    harness.detectChanges();
    expect(academy.state().accessRequests![0].status).toBe('Acknowledged');
    expect(harness.routeNativeElement!.textContent).toContain('No disclosure');
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await harness.navigateByUrl('/staff-portal/training/history');
    expect(harness.routeNativeElement!.textContent).toContain('HR acknowledged');
    expect(harness.routeNativeElement!.textContent).not.toContain('Download PDF');
  });
  it('keeps personal lesson notes out of another worker’s administrator preview', async () => {
    const managerEmail = actor().email;
    const other = store.staff().find((p) => p.email !== managerEmail)!;
    const course = academy.state().courses[0];
    academy.assign([other.id], [course.id], '2026-12-31', 0, '', false, true, 'lqcs');
    const assignment = academy
      .assignments()
      .find((a) => a.personId === other.id && a.courseId === course.id && !a.archived)!;
    actor.update((a) => ({ ...a, email: other.email }));
    expect(
      academy.saveLesson(
        assignment.id,
        course.lessons[0].id,
        'Private learner reflection',
        null,
        false,
        'lqcs',
      ),
    ).toBeNull();
    actor.update((a) => ({ ...a, email: managerEmail }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/courses/' +
        course.id +
        '/lessons/' +
        course.lessons[0].id +
        '?person=' +
        other.id +
        '&preview=1',
    );
    expect(harness.routeNativeElement!.textContent).toContain('Administrator preview');
    expect(harness.routeNativeElement!.textContent).not.toContain('Private learner reflection');
    expect(harness.routeNativeElement!.querySelector('[aria-label="My lesson notes"]')).toBeNull();
  });
  it('creates the course profile from the reference form and keeps its live summary in sync', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/courses/new');
    const page = harness.routeNativeElement!;
    await harness.fixture.whenStable();
    const fill = (label: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>('[aria-label="' + label + '"]')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const select = (label: string, value: unknown) => {
      harness
        .routeDebugElement!.queryAll(By.directive(MatSelect))
        .find((e) => e.nativeElement.getAttribute('aria-label') === label)!
        .triggerEventHandler('ngModelChange', value);
    };
    fill('Course title', 'Medication Awareness for Home Care');
    fill('Course code', 'CVTA-MED-TEST');
    fill('Course description', 'A sample knowledge course for home care.');
    fill('Learning outcome 1', 'Recognise when to ask an authorised supervisor for guidance.');
    select('Applicable staff roles', [store.staff()[0].role]);
    select('Compliance tags', ['Medication', 'Home Care']);
    select('Estimated duration', 45);
    select('Course pass mark', 80);
    select('Refresher interval', 12);
    page
      .querySelector<HTMLInputElement>(
        'input[aria-label="Requires practical sign-off separately"]',
      )!
      .click();
    harness.detectChanges();
    const summary = page.querySelector('.course-summary')!;
    expect(summary.textContent).toContain('45 minutes');
    expect(summary.textContent).toContain('80%');
    expect(summary.textContent).toContain('12 months');
    expect(summary.querySelectorAll('.post-pass-row')).toHaveLength(5);
    Array.from(page.querySelectorAll<HTMLButtonElement>('.course-heading button'))
      .find((b) => b.textContent?.includes('Save & Continue'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const saved = academy.state().courseDrafts.find((c) => c.code === 'CVTA-MED-TEST')!;
    expect(saved).toBeDefined();
    expect(saved.status).toBe('Draft');
    expect(saved.tags).toEqual(['Medication', 'Home Care']);
    expect(saved.estimatedMinutes).toBe(45);
    expect(saved.practicalRequired).toBe(true);
    expect(saved.active).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/manage/learning/content/' + saved.id);
    expect(
      harness.routeNativeElement!.querySelector('[aria-current="step"]')?.textContent,
    ).toContain('Video & Resources');
  });
  it('creates one course through all six steps and resumes its bank without duplicating questions', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const assignments = academy.assignments().length;
    const harness = await RouterTestingHarness.create('/manage/learning/courses');
    const page = () => harness.routeNativeElement!;
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const button = (text: string) =>
      Array.from(page().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.replace(/\s+/g, ' ').includes(text),
      )!;
    const fill = (label: string, value: string) => {
      const input = page().querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    const step = (number: number, label: string) => {
      expect(page().querySelector('[aria-current="step"]')?.textContent).toContain(number + label);
      expect(page().querySelector('[role="alert"]')).toBeNull();
    };
    page().querySelector<HTMLAnchorElement>('a[href="/manage/learning/courses/new"]')!.click();
    await settle();
    step(1, 'Course Details');
    expect(page().querySelectorAll('cv-academy-course-steps [aria-disabled="true"]')).toHaveLength(
      5,
    );
    button('Save & Continue').click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/courses/new');
    expect(page().querySelector('[role="alert"]')).not.toBeNull();
    fill('Course title', 'Six step course');
    fill('Course code', 'CVTA-WIZARD');
    fill('Course description', 'Safe practice for staff.');
    fill('Learning outcome 1', 'Recognise safe practice.');
    harness
      .routeDebugElement!.queryAll(By.directive(MatSelect))
      .find((e) => e.nativeElement.getAttribute('aria-label') === 'Applicable staff roles')!
      .triggerEventHandler('ngModelChange', [store.staff()[0].role]);
    button('Save & Continue').click();
    await settle();
    const id = academy.state().courseDrafts.find((c) => c.code === 'CVTA-WIZARD')!.id;
    step(2, 'Video & Resources');
    button('Save & Continue').click();
    await settle();
    step(3, 'Modules & Lessons');
    button('Add Module').click();
    await settle();
    fill('Structure item title', 'Introduction');
    page()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    button('Add Lesson').click();
    await settle();
    fill('Structure item title', 'Safe practice');
    fill('Lesson content', 'Read this introduction to safe practice.');
    fill('Lesson duration', '5');
    page()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    button('Save & Continue to Questions').click();
    await settle();
    step(4, 'Questions');
    button('Back to Modules').click();
    await settle();
    step(3, 'Modules & Lessons');
    button('Save & Continue to Questions').click();
    await settle();
    step(4, 'Questions');
    expect(academy.editableQuestions().filter((q) => q.courseId === id)).toHaveLength(0);
    fill('Question text', 'What should staff follow?');
    fill('Question topic', 'Safe practice');
    ['Approved guidance', 'Guesswork', 'Unverified advice', 'Outdated notes'].forEach((v, i) =>
      fill('Answer option ' + (i + 1), v),
    );
    page().querySelector<HTMLInputElement>('[aria-label="Correct answer 1"]')!.click();
    fill('Question explanation', 'Follow approved guidance for safe practice.');
    button('Publish selected question').click();
    await settle();
    button('Save & Continue to Rules').click();
    await settle();
    step(5, 'Rules & Assignments');
    button('Save & Continue to Publishing').click();
    await settle();
    step(6, 'Publish');
    expect(TestBed.inject(Router).url).toBe('/manage/learning/publish/' + id);
    fill('Publication course owner', 'Training Lead');
    fill('Publication issuer', 'CareVerity Academy');
    fill('Publication approver', 'Training Manager');
    fill('Publication effective date', londonDate());
    fill('Publication content rights', 'Provider-owned content');
    await settle();
    expect(page().querySelector('.publish-blocker')?.textContent).toBeUndefined();
    page().querySelector<HTMLInputElement>('[aria-label="Confirm publication approval"]')!.click();
    await settle();
    expect(page().querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(false);
    page().querySelector<HTMLButtonElement>('.publish-action')!.click();
    await settle();
    expect(page().querySelector('.publication-success')?.textContent).toContain('published');
    expect(academy.state().courses.filter((c) => c.id === id)).toHaveLength(1);
    expect(
      academy.state().questions.filter((q) => q.courseId === id && q.status === 'Published'),
    ).toHaveLength(1);
    expect(academy.assignments()).toHaveLength(assignments);
    expect(confirm).not.toHaveBeenCalled();
  });
  it('keeps a draft visibly unpublished when publication validation fails', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.id = 'profile-publication-test';
    course.status = 'Draft';
    course.code = 'CVTA-UNREADY';
    course.lessons = [];
    expect(academy.saveCourse(course, 'lqcs')).toBeNull();
    const harness = await RouterTestingHarness.create('/manage/learning/courses/' + course.id);
    harness
      .routeNativeElement!.querySelector<HTMLAnchorElement>(
        'cv-academy-course-steps a[href="/manage/learning/publish/' + course.id + '"]',
      )!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/publish/' + course.id);
    expect(harness.routeNativeElement!.querySelector('.publish-blocker')?.textContent).toContain(
      'Published courses require',
    );
    expect(
      harness.routeNativeElement!.querySelector('.course-review .status-pill')?.textContent?.trim(),
    ).toBe('Draft');
    expect(academy.state().courses.some((c) => c.id === course.id)).toBe(false);
  });
  it('queues uploads, blocks unused videos and places video/resource lessons into modules before continuing', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.id = 'upload-course';
    course.code = 'CVTA-UPLOAD';
    course.status = 'Draft';
    course.lessons = [];
    expect(academy.saveCourse(course, 'lqcs')).toBeNull();
    const files = TestBed.inject(AcademyAssets);
    let index = 0;
    vi.spyOn(files, 'url').mockResolvedValue('blob:academy-media');
    vi.spyOn(files, 'upload').mockImplementation(async (file) => {
      const id = 'upload-' + ++index;
      expect(
        academy.saveAsset(
          {
            id,
            name: file.name,
            size: file.size,
            mime: file.type,
            kind: file.type.startsWith('video/') ? 'Video' : 'Document',
            status: file.type.startsWith('video/') ? 'CAPTIONS_REVIEW' : 'READY',
            at: '',
            by: 'Manager',
          },
          'lqcs',
        ),
      ).toBeNull();
      return id;
    });
    const harness = await RouterTestingHarness.create('/manage/learning/content/' + course.id);
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    expect(page.querySelector('[aria-current="step"]')?.textContent).toContain('Video & Resources');
    const videoInput = page.querySelector<HTMLInputElement>(
      '[aria-label="Upload training videos"]',
    )!;
    Object.defineProperty(videoInput, 'files', {
      value: [
        new File(['video'], 'Lesson_1.mp4', { type: 'video/mp4' }),
        new File(['video'], 'Lesson_2.webm', { type: 'video/webm' }),
        new File(['wrong'], 'notes.txt', { type: 'text/plain' }),
      ],
    });
    videoInput.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelectorAll('.video-queue tbody tr').length).toBe(2);
    expect(page.querySelector('.upload-failure')?.textContent).toContain('notes.txt');
    expect(page.querySelector('.subtitles-warning')?.textContent).toContain('Missing Subtitles');
    const resourceInput = page.querySelector<HTMLInputElement>(
      '[aria-label="Upload supporting resources"]',
    )!;
    Object.defineProperty(resourceInput, 'files', {
      value: [
        new File(['pdf'], 'Handbook.pdf', { type: 'application/pdf' }),
        new File(['docx'], 'Quick_Guide.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ],
    });
    resourceInput.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelectorAll('.resource-table tbody tr').length).toBe(2);
    const optional = page.querySelector<HTMLInputElement>(
      '[aria-label="Mandatory resource: Quick_Guide.docx"]',
    )!;
    optional.click();
    harness.detectChanges();
    expect(optional.checked).toBe(false);
    page.querySelector<HTMLButtonElement>('.upload-footer .primary')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/structure/upload-course');
    const saved = academy.course(course.id)!;
    expect(saved.lessons).toHaveLength(0);
    expect(saved.pendingLessons?.filter((l) => l.videoId).map((l) => l.videoId)).toEqual([
      'upload-1',
      'upload-2',
    ]);
    expect(
      saved.pendingLessons?.find((l) => l.handoutIds.includes('upload-4'))?.optionalHandoutIds,
    ).toEqual(['upload-4']);
    expect(harness.routeNativeElement!.querySelectorAll('.unused-upload')).toHaveLength(4);
    const currentPage = () => harness.routeNativeElement!;
    const next = () =>
      currentPage().querySelector<HTMLButtonElement>('.structure-footer .primary')!;
    expect(next().disabled).toBe(true);
    expect(
      currentPage().querySelectorAll('cv-academy-course-steps [aria-disabled="true"]'),
    ).toHaveLength(3);
    // Later authoring URLs must return to module placement while a video is unused.
    for (const path of [
      '/manage/learning/questions?course=' + course.id,
      '/manage/learning/rules/' + course.id,
      '/manage/learning/publish/' + course.id,
    ]) {
      await harness.navigateByUrl(path);
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/manage/learning/structure/' + course.id);
    }
    const fill = (label: string, value: string) => {
      const field = currentPage().querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const submit = async () => {
      currentPage()
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle();
    };
    Array.from(currentPage().querySelectorAll<HTMLButtonElement>('.structure-heading button'))
      .find((b) => b.textContent?.includes('Add Module'))!
      .click();
    await settle();
    fill('Structure item title', 'Introduction');
    await submit();
    currentPage()
      .querySelector<HTMLButtonElement>('[aria-label="Add upload Lesson_1.mp4 to module"]')!
      .click();
    await settle();
    await submit();
    expect(currentPage().querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain(
      'brief description',
    );
    fill('Lesson content', 'An introduction to safe practice.');
    await submit();
    expect(currentPage().querySelectorAll('.unused-upload')).toHaveLength(3);
    expect(currentPage().querySelector('.lesson-table')?.textContent).not.toContain(
      'An introduction to safe practice.',
    );
    expect(
      harness
        .routeDebugElement!.queryAll(By.directive(MatTooltip))
        .map((e) => e.injector.get(MatTooltip).message),
    ).toContain('An introduction to safe practice.');
    expect(next().disabled).toBe(true);
    currentPage()
      .querySelector<HTMLButtonElement>('[aria-label="Delete unused upload Lesson_2.webm"]')!
      .click();
    await settle();
    expect(next().disabled).toBe(false);
    for (const name of ['Handbook.pdf', 'Quick_Guide.docx']) {
      currentPage()
        .querySelector<HTMLButtonElement>('[aria-label="Add upload ' + name + ' to module"]')!
        .click();
      await settle();
      fill('Lesson content', 'Read the ' + name + ' guidance.');
      await submit();
    }
    expect(currentPage().querySelector('.unused-uploads')).toBeNull();
    next().click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/questions?course=' + course.id);
    const structured = academy.course(course.id)!;
    expect(structured.pendingLessons).toEqual([]);
    expect(structured.lessons.map((l) => l.videoId)).toEqual(['upload-1', '', '']);
    expect(structured.lessons.every((l) => l.moduleId === structured.modules![0].id)).toBe(true);
    expect(structured.lessons[2].handoutIds).toEqual(['upload-4']);
    expect(structured.lessons[2].optionalHandoutIds).toEqual(['upload-4']);
    expect(academy.state().assets.some((a) => a.id === 'upload-2')).toBe(true);
    await harness.navigateByUrl('/manage/learning/structure/' + course.id);
    await settle();
    currentPage()
      .querySelector<HTMLButtonElement>('[aria-label="Actions for lesson Lesson 1"]')!
      .click();
    await settle();
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((b) => b.textContent?.trim() === 'Remove lesson')!
      .click();
    await settle();
    expect(currentPage().querySelector('.unused-uploads')?.textContent).toContain('Lesson_1.mp4');
    expect(next().disabled).toBe(true);
    currentPage()
      .querySelector<HTMLButtonElement>('[aria-label="Delete unused upload Lesson_1.mp4"]')!
      .click();
    await settle();
    expect(next().disabled).toBe(false);
  });
  it('attaches SRT subtitles to the selected video and requires a transcript for caption generation', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.id = 'caption-course';
    course.code = 'CVTA-CAPTIONS';
    course.status = 'Draft';
    course.lessons = [course.lessons[0]];
    course.lessons[0].videoId = 'caption-video';
    course.lessons[0].captionId = '';
    course.lessons[0].transcript = '';
    academy.saveAsset(
      {
        id: 'caption-video',
        name: 'Medication.mp4',
        size: 100,
        mime: 'video/mp4',
        kind: 'Video',
        status: 'CAPTIONS_REVIEW',
        at: '',
        by: 'Manager',
      },
      'lqcs',
    );
    expect(academy.saveCourse(course, 'lqcs')).toBeNull();
    const files = TestBed.inject(AcademyAssets);
    vi.spyOn(files, 'url').mockResolvedValue('blob:academy-captions');
    const upload = vi.spyOn(files, 'upload').mockImplementation(async (file) => {
      expect(['lesson.vtt', 'draft-captions.vtt']).toContain(file.name);
      expect(await file.text()).toContain('WEBVTT');
      if (file.name === 'lesson.vtt')
        expect(await file.text()).toContain('00:00:00.000 --> 00:00:02.000');
      academy.saveAsset(
        {
          id: 'caption-track-' + file.name,
          name: file.name,
          size: file.size,
          mime: file.type,
          kind: 'Captions',
          status: 'READY',
          at: '',
          by: 'Manager',
        },
        'lqcs',
      );
      return 'caption-track-' + file.name;
    });
    const harness = await RouterTestingHarness.create(
      '/manage/learning/content/' + course.id + '/' + course.lessons[0].id,
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Generate Captions'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Add the video transcript');
    expect(upload).not.toHaveBeenCalled();
    const input = page.querySelector<HTMLInputElement>('[aria-label="Upload subtitles"]')!;
    const subtitle = new File(['1\n00:00:00,000 --> 00:00:02,000\nWelcome\n'], 'lesson.srt', {
      type: 'text/plain',
    });
    Object.defineProperty(input, 'files', { value: [subtitle] });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(upload).toHaveBeenCalledOnce();
    expect(page.querySelector('.video-queue')?.textContent).toContain('CC Attached');
    expect(page.querySelector('.video-queue')?.textContent).toContain('Needs Attention');
    expect(page.querySelector('[role="alert"]')).toBeNull();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Save & approve'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('transcript');
    expect(academy.state().assets.find((a) => a.id === 'caption-video')?.status).toBe(
      'CAPTIONS_REVIEW',
    );
    const transcript = page.querySelector<HTMLTextAreaElement>('textarea')!;
    transcript.value = 'Welcome to medication awareness training.';
    transcript.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Generate Captions'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(page.textContent).toContain('Draft captions created from the transcript');
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Save & approve'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(academy.state().assets.find((a) => a.id === 'caption-video')?.status).toBe('READY');
    expect(academy.course(course.id)?.lessons[0].captionId).toBe(
      'caption-track-draft-captions.vtt',
    );
    expect(page.querySelector('.video-queue')?.textContent).toContain('Reviewed');
  });
  it('creates modules and lessons from step three and persists the structure with its live summary', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.id = 'structure-course';
    course.code = 'CVTA-STRUCTURE';
    course.status = 'Draft';
    course.lessons = [];
    expect(academy.saveCourse(course, 'lqcs')).toBeNull();
    const harness = await RouterTestingHarness.create('/manage/learning/structure/' + course.id);
    const page = harness.routeNativeElement!;
    const topButton = (label: string) =>
      Array.from(page.querySelectorAll<HTMLButtonElement>('.structure-heading button')).find((b) =>
        b.textContent?.includes(label),
      )!;
    const fill = (label: string, value: string) => {
      const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    topButton('Add Module').click();
    await harness.fixture.whenStable();
    fill('Structure item title', 'Introduction');
    page
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    topButton('Add Lesson').click();
    await harness.fixture.whenStable();
    fill('Structure item title', 'Welcome & Course Overview');
    fill('Lesson content', 'Read the course overview and understand the learning outcomes.');
    fill('Lesson duration', '5');
    page
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.lesson-table')?.textContent).toContain('Welcome & Course Overview');
    expect(page.querySelector('.lesson-table')?.textContent).toContain('Configured');
    topButton('Add Module').click();
    await harness.fixture.whenStable();
    fill('Structure item title', 'Safe Practice');
    page
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.structure-summary')?.textContent).toContain(
      'Safe Practice: add a lesson.',
    );
    expect(page.querySelector('.structure-badge')?.textContent).toContain('In Progress');
    topButton('Save Structure').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const saved = academy.course(course.id)!;
    expect(saved.status).toBe('Draft');
    expect(saved.modules?.map((m) => m.title)).toEqual(['Introduction', 'Safe Practice']);
    expect(saved.lessons[0].moduleId).toBe(saved.modules![0].id);
    expect(saved.lessons[0].minutes).toBe(5);
    expect(page.querySelector('.learning-time')?.textContent).toContain('5 minutes');
    expect(page.textContent).toContain('Course structure saved as a draft');
    await harness.navigateByUrl('/manage/learning/courses/' + course.id);
    await harness.navigateByUrl('/manage/learning/structure/' + course.id);
    expect(harness.routeNativeElement!.querySelectorAll('.outline-select').length).toBe(2);
    expect(harness.routeNativeElement!.querySelector('.lesson-table')?.textContent).toContain(
      'Welcome & Course Overview',
    );
  });
  it('reorders lessons and saves module completion rules without changing the live published course', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [
      { id: 'intro', title: 'Introduction' },
      { id: 'practice', title: 'Safe Practice' },
    ];
    course.lessons.forEach((l, i) => {
      l.moduleId = i < 2 ? 'intro' : 'practice';
      l.moduleTitle = i < 2 ? 'Introduction' : 'Safe Practice';
    });
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const first = course.lessons[0],
      second = course.lessons[1];
    const harness = await RouterTestingHarness.create('/manage/learning/structure/' + course.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    page
      .querySelector<HTMLButtonElement>('[aria-label="Actions for lesson ' + second.title + '"]')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((b) => b.textContent?.includes('Move lesson up'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const titles = Array.from(page.querySelectorAll('.lesson-title')).map((el) =>
      el.textContent?.trim(),
    );
    expect(titles).toEqual([second.title, first.title]);
    const select = (label: string, value: unknown) => {
      const control = harness
        .routeDebugElement!.queryAll(By.directive(MatSelect))
        .find((d) => d.nativeElement.getAttribute('aria-label') === label)!;
      control.triggerEventHandler('ngModelChange', value);
      harness.detectChanges();
    };
    select('Minimum watch time for Introduction', 75);
    const ack = page.querySelector<HTMLInputElement>(
      '[aria-label="Require document acknowledgement for Introduction"]',
    )!;
    if (!ack.checked) ack.click();
    page.querySelector<HTMLInputElement>('[aria-label="Require sequential completion"]')!.click();
    page.querySelector<HTMLButtonElement>('[aria-label="Open module Safe Practice"]')!.click();
    harness.detectChanges();
    select('Prerequisite modules for Safe Practice', ['intro']);
    Array.from(page.querySelectorAll<HTMLButtonElement>('.structure-heading button'))
      .find((b) => b.textContent?.includes('Save Structure'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const draft = academy.course(course.id)!;
    expect(draft.lessons.slice(0, 2).map((l) => l.id)).toEqual([second.id, first.id]);
    expect(
      draft.lessons.slice(0, 2).every((l) => l.watchThreshold === 75 && l.requireResourceAck),
    ).toBe(true);
    expect(draft.modules?.[1].prerequisiteModuleIds).toEqual(['intro']);
    expect(draft.policy?.sequentialLessons).toBe(false);
    expect(academy.state().courses.find((c) => c.id === course.id)?.lessons[0].id).toBe(first.id);
  });
  it('authors a complete question bank, assigns selected questions to a module schedule, and previews answers', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.status = 'Draft';
    course.modules = [{ id: 'bank-intro', title: 'Introduction' }];
    course.lessons.forEach((l) => {
      l.moduleId = 'bank-intro';
      l.moduleTitle = 'Introduction';
    });
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const harness = await RouterTestingHarness.create(
      '/manage/learning/questions/new?course=' + course.id,
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const fill = (label: string, value: string) => {
      const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    const button = (label: string) =>
      Array.from(page.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.replace(/\s+/g, ' ').trim().endsWith(label),
      )!;
    fill('Question text', 'What should you do when a medication discrepancy is found?');
    fill('Question topic', 'Medication');
    [
      'Ignore it',
      'Pause and report the concern',
      'Change the record',
      'Wait until tomorrow',
    ].forEach((text, i) => fill('Answer option ' + (i + 1), text));
    page.querySelector<HTMLInputElement>('[aria-label="Correct answer 2"]')!.click();
    fill('Question explanation', 'Pause and report concerns under the approved policy.');
    fill('Question marks', '2');
    page.querySelector<HTMLInputElement>('[aria-label="Critical question"]')!.click();
    harness.detectChanges();
    expect(page.querySelectorAll('.answer-option.correct')).toHaveLength(1);
    button('Add Question Group').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    fill('Question group name', 'Medication checkpoint');
    page.querySelector<HTMLInputElement>('[aria-label="Count toward final grade"]')!.click();
    fill('Group available after days', '2');
    fill('Group due after days', '5');
    page
      .querySelector('.group-modal form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.group-navigation')?.textContent).toContain(
      'After module: Introduction · Opens day 2 · Due day 5',
    );
    const checkboxes = page.querySelectorAll<HTMLInputElement>('.bulk-select input');
    checkboxes[checkboxes.length - 1].click();
    harness.detectChanges();
    const select = harness
      .routeDebugElement!.queryAll(By.directive(MatSelect))
      .find(
        (d) => d.nativeElement.getAttribute('aria-label') === 'Assign selected questions to group',
      )!;
    const groupId = (select.componentInstance as MatSelect).options.find(
      (o) => o.viewValue === 'Medication checkpoint',
    )!.value;
    select.triggerEventHandler('ngModelChange', groupId);
    harness.detectChanges();
    button('Assign Selected').click();
    button('Save Question Bank').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    const saved = academy
      .editableQuestions()
      .find((q) => q.text === 'What should you do when a medication discrepancy is found?')!;
    expect(saved.status).toBe('Draft');
    expect(saved.weight).toBe(2);
    expect(saved.critical).toBe(true);
    expect(saved.groupId).toBe(groupId);
    expect(saved.correctIds).toEqual([saved.options[1].id]);
    expect(academy.course(course.id)?.questionGroups?.[0]).toMatchObject({
      title: 'Medication checkpoint',
      countsTowardGrade: true,
      kind: 'Quiz',
      placement: 'After module',
      moduleId: 'bank-intro',
      availableAfterDays: 2,
      dueAfterDays: 5,
    });
    expect(page.querySelector('.version-history')?.textContent).toContain('v1 (Current)');
    button('Preview Question').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelectorAll('.question-modal .preview-option.correct')).toHaveLength(0);
    button('Show correct answers & feedback').click();
    harness.detectChanges();
    expect(page.querySelectorAll('.question-modal .preview-option.correct')).toHaveLength(1);
    page.querySelector<HTMLButtonElement>('[aria-label="Close question preview"]')!.click();
    harness.detectChanges();
    button('Publish selected question').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(academy.state().questions.find((q) => q.id === saved.id)?.status).toBe('Published');
    expect(academy.state().courses.find((c) => c.id === course.id)?.questionGroups).toBeUndefined();
  });
  it('authors a survey within a module and lets the assigned learner submit feedback without a grade or certificate', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.modules = [{ id: 'survey-module', title: 'Introduction' }];
    course.lessons.forEach((l) => {
      l.moduleId = 'survey-module';
      l.moduleTitle = 'Introduction';
    });
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const harness = await RouterTestingHarness.create(
      '/manage/learning/questions?course=' + course.id,
    );
    const page = () => harness.routeNativeElement!;
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const button = (label: string) =>
      Array.from(page().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.replace(/\s+/g, ' ').trim().endsWith(label),
      )!;
    const fill = (label: string, value: string) => {
      const input = page().querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    const select = (label: string, value: string) => {
      harness
        .routeDebugElement!.queryAll(By.directive(MatSelect))
        .find((e) => e.nativeElement.getAttribute('aria-label') === label)!
        .triggerEventHandler('ngModelChange', value);
      harness.detectChanges();
    };
    button('Add Question Group').click();
    await settle();
    fill('Question group name', 'Introduction feedback');
    page().querySelector<HTMLInputElement>('[aria-label="Count toward final grade"]')!.click();
    await settle();
    select('Question group type', 'Survey');
    await settle();
    const counted = page().querySelector<HTMLInputElement>(
      '[aria-label="Count toward final grade"]',
    )!;
    expect(counted.disabled).toBe(true);
    expect(counted.checked).toBe(false);
    select('Assessment placement', 'Within module');
    await settle();
    page()
      .querySelector('.group-modal form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Select group Introduction feedback"]')!
      .click();
    await settle();
    expect(page().querySelector('.selected-bank')?.textContent).toContain(
      'No questions in this bank',
    );
    expect(page().querySelector('.question-editor')).toBeNull();
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Add question to Introduction feedback"]')!
      .click();
    await settle();
    expect(page().querySelectorAll('.group-select')).toHaveLength(2);
    expect(page().querySelectorAll('.selected-bank .question-item')).toHaveLength(1);
    select('Question type', 'Free text');
    await settle();
    fill('Question text', 'What would help you learn?');
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Select group Final course assessment"]')!
      .click();
    await settle();
    expect(page().querySelector('.selected-bank')?.textContent).not.toContain(
      'What would help you learn?',
    );
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Select group Introduction feedback"]')!
      .click();
    await settle();
    expect(page().querySelector<HTMLTextAreaElement>('[aria-label="Question text"]')!.value).toBe(
      'What would help you learn?',
    );
    expect(page().querySelector('.bank-summary')?.textContent).toContain('Summary');
    expect(page().querySelector<HTMLButtonElement>('[aria-label="Next question"]')!.disabled).toBe(
      true,
    );
    expect(page().querySelector('[aria-label="Correct answer 1"]')).toBeNull();
    button('Publish selected question').click();
    await settle();
    expect(page().querySelector('[role="alert"]')).toBeNull();
    const saved = academy.editableQuestions().find((q) => q.text === 'What would help you learn?')!;
    expect(saved).toMatchObject({
      type: 'Free text',
      correctIds: [],
      critical: false,
      status: 'Published',
    });
    const draft = structuredClone(academy.course(course.id)!);
    draft.status = 'Published';
    expect(academy.saveCourse(draft, 'lqcs', draft.updatedAt)).toBeNull();
    const person = academy.me()!;
    expect(
      academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    expect(
      academy.saveLesson(assignment.id, course.lessons[0].id, null, null, true, 'lqcs'),
    ).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await harness.navigateByUrl('/staff-portal/training/courses/' + course.id);
    await settle();
    expect(academy.assignedCourse(assignment)?.questionGroups?.[0]).toMatchObject({
      kind: 'Survey',
      placement: 'Within module',
    });
    const card = page().querySelector('.checkpoint-card')!;
    expect(card.textContent).toContain('Introduction feedback');
    const lessonLinks = card.parentElement!.querySelectorAll('.list-item');
    expect(
      lessonLinks[0].compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      card.compareDocumentPosition(lessonLinks[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    button('Start survey').click();
    await settle();
    fill('Survey response', 'More worked examples.');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    button('Submit Survey').click();
    await settle();
    expect(page().querySelector('.survey-result')?.textContent).toContain('More worked examples.');
    expect(page().textContent).toContain('does not contribute to your final grade');
    expect(page().querySelector('.result-stats')).toBeNull();
    expect(academy.assignment(assignment.id)?.completedAt).toBe('');
    expect(academy.state().certificates.some((c) => c.assignmentId === assignment.id)).toBe(false);
  });
  it('shows module checkpoints in the learner journey and records a checkpoint without a course evidence timeline', async () => {
    const course = academy.state().courses[0];
    const person = academy.me()!;
    expect(
      academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, false, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    const q = structuredClone(academy.state().questions.find((q) => q.courseId === course.id)!);
    q.id = 'portal-checkpoint-q';
    q.groupId = 'portal-checkpoint';
    store.update((d) => ({
      ...d,
      academy: {
        ...academy.state(),
        assignments: academy.state().assignments.map((a) =>
          a.id === assignment.id
            ? {
                ...a,
                completedLessonIds: [course.lessons[0].id],
                courseSnapshot: {
                  ...course,
                  questionGroups: [
                    {
                      id: 'portal-checkpoint',
                      title: 'Introduction review',
                      placement: 'After lesson',
                      moduleId: '',
                      lessonId: course.lessons[0].id,
                      availableAfterDays: 0,
                      dueAfterDays: 7,
                      required: true,
                    },
                  ],
                },
                questionSnapshot: [
                  ...(a.questionSnapshot ??
                    academy.state().questions.filter((q) => q.courseId === course.id)),
                  q,
                ],
              }
            : a,
        ),
      },
    }));
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/courses/' + course.id,
    );
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.checkpoint-card')?.textContent).toContain('Introduction review');
    page.querySelector<HTMLButtonElement>('.checkpoint-card button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toContain(
      'Introduction review',
    );
    const attempt = academy
      .state()
      .attempts.find((a) => a.assignmentId === assignment.id && a.groupId === 'portal-checkpoint')!;
    expect(academy.answer(attempt.id, q.id, q.correctIds, null, 'lqcs')).toBeNull();
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    await harness.navigateByUrl('/staff-portal/training/results/' + attempt.id);
    expect(harness.routeNativeElement!.textContent).toContain(
      'Your practice checkpoint result is saved',
    );
    expect(harness.routeNativeElement!.querySelector('cv-academy-timeline')).toBeNull();
    expect(academy.state().certificates.some((c) => c.assignmentId === assignment.id)).toBe(false);
  });
  it('saves the reference rules setup, reviews role targets and starts refresher cycles with the new policy', async () => {
    const course = academy.state().courses[0],
      person = store.staff()[0];
    const harness = await RouterTestingHarness.create('/manage/learning/rules/' + course.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const button = (label: string) =>
      Array.from(page.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.replace(/\s+/g, ' ').trim().endsWith(label),
      )!;
    const select = (label: string, value: unknown) => {
      const control = harness
        .routeDebugElement!.queryAll(By.directive(MatSelect))
        .find((d) => d.nativeElement.getAttribute('aria-label') === label)!;
      control.triggerEventHandler('ngModelChange', value);
      harness.detectChanges();
    };
    expect(page.querySelectorAll('.rules-layout > .panel')).toHaveLength(3);
    expect(page.querySelectorAll('.post-pass-card')).toHaveLength(6);
    expect(
      Array.from(page.querySelectorAll<HTMLInputElement>('.required-toggle input')).every(
        (i) => i.checked && i.disabled,
      ),
    ).toBe(true);
    const pass = page.querySelector<HTMLInputElement>('[aria-label="Assessment pass mark"]')!;
    pass.value = '90';
    pass.dispatchEvent(new Event('input'));
    select('Assessment attempt limit', 2);
    select('Assessment retake wait', 6);
    page.querySelector<HTMLInputElement>('[aria-label="Timed assessment"]')!.click();
    harness.detectChanges();
    select('Assignment roles', [person.role]);
    select('Assignment priority', 'Urgent');
    page.querySelector<HTMLInputElement>('[aria-label="Send refresher assignment"]')!.click();
    harness.detectChanges();
    const before = academy.assignments().length;
    button('Save Rules & Assignments').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(academy.assignments()).toHaveLength(before);
    const draft = academy.course(course.id)!;
    expect(draft.status).toBe('Draft');
    expect(draft.passMark).toBe(90);
    expect(draft.policy).toMatchObject({ maxAttempts: 2, retakeWaitHours: 6, timeLimitMinutes: 0 });
    expect(draft.assignmentPlan).toMatchObject({
      method: 'By Role',
      roles: [person.role],
      priority: 'Urgent',
      refresher: true,
    });
    const targets = academy.assignmentTargets(draft, draft.assignmentPlan!);
    button('Assign Training').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelectorAll('.review-staff-list article')).toHaveLength(targets.length);
    page.querySelector<HTMLButtonElement>('[aria-label="Confirm training assignment"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.assignment-review')).toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    const assigned = academy
      .assignments()
      .filter(
        (a) => a.courseId === course.id && !a.archived && targets.some((p) => p.id === a.personId),
      );
    expect(assigned).toHaveLength(targets.length);
    expect(
      assigned.every(
        (a) =>
          a.type === 'Refresher' &&
          a.source === 'By Role' &&
          a.priority === 'Urgent' &&
          a.policySnapshot?.maxAttempts === 2 &&
          a.policySnapshot.timeLimitMinutes === 0 &&
          a.courseSnapshot?.passMark === 90,
      ),
    ).toBe(true);
    expect(
      assigned.every(
        (a) =>
          a.notificationRequests?.find((r) => r.channel === 'Email')?.status === 'Not configured',
      ),
    ).toBe(true);
    expect(page.querySelector('.assigned-table')?.textContent).toContain('Refresher');
  });
  it('keeps an HR-origin rules assignment on that exact worker and preserves refresher history', async () => {
    const person = store.staff()[0],
      course = academy.state().courses[0];
    academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, false, 'lqcs');
    const original = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    academy.saveLesson(original.id, course.lessons[0].id, null, null, true, 'lqcs');
    const harness = await RouterTestingHarness.create(
      '/manage/learning/rules/' + course.id + '?person=' + person.id + '&action=refresher',
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(page.querySelector<HTMLInputElement>('[aria-label="By Role"]')?.disabled).toBe(true);
    expect(
      page.querySelector<HTMLInputElement>('[aria-label="From HR Staff Profile"]')?.checked,
    ).toBe(true);
    Array.from(page.querySelectorAll<HTMLButtonElement>('.rules-heading button'))
      .find((b) => b.textContent?.includes('Assign Training'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelectorAll('.review-staff-list article')).toHaveLength(1);
    expect(page.querySelector('.review-staff-list')?.textContent).toContain(person.name);
    page.querySelector<HTMLButtonElement>('[aria-label="Confirm training assignment"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const active = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    expect(active.id).not.toBe(original.id);
    expect(active.type).toBe('Refresher');
    expect(active.source).toBe('From HR Staff Profile');
    expect(academy.assignments().find((a) => a.id === original.id)?.archived).toBe(true);
    expect(academy.assignments().find((a) => a.id === original.id)?.completedLessonIds).toContain(
      course.lessons[0].id,
    );
  });
  it('retains the assignment review and rolls back publication when course rules are invalid', async () => {
    const course = academy.state().courses[0],
      person = store.staff()[0];
    const before = structuredClone(academy.state());
    const harness = await RouterTestingHarness.create(
      '/manage/learning/rules/' + course.id + '?person=' + person.id,
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const input = page.querySelector<HTMLInputElement>('[aria-label="Assessment pass mark"]')!;
    input.value = '101';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('.rules-heading button'))
      .find((b) => b.textContent?.includes('Assign Training'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('[aria-label="Confirm training assignment"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.assignment-review')).not.toBeNull();
    expect(page.querySelector('.assignment-review [role="alert"]')?.textContent).toContain(
      'pass mark',
    );
    expect(academy.state()).toEqual(before);
  });
  it('publishes a newly approved question bank before assigning its new immutable course version', async () => {
    const course = academy.state().courses[0],
      person = store.staff()[0];
    const question = structuredClone(
      academy.state().questions.find((q) => q.courseId === course.id)!,
    );
    question.text = 'Approved revised assessment question for the new course version';
    expect(academy.saveQuestion(question, 'lqcs', question.updatedAt)).toBeNull();
    const harness = await RouterTestingHarness.create(
      '/manage/learning/rules/' + course.id + '?person=' + person.id + '&action=refresher',
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    Array.from(page.querySelectorAll<HTMLButtonElement>('.rules-heading button'))
      .find((b) => b.textContent?.includes('Assign Training'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const confirm = page.querySelector<HTMLButtonElement>(
      '[aria-label="Confirm training assignment"]',
    )!;
    expect(confirm.textContent).toContain('Publish Approved Version & Assign');
    confirm.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    expect(assignment.courseVersion).toBeGreaterThan(course.version);
    expect(assignment.questionSnapshot?.find((q) => q.id === question.id)?.text).toBe(
      question.text,
    );
    expect(assignment.courseSnapshot?.assignmentPlan).toBeUndefined();
  });
  it('reviews real publication approvals, invalidates changed confirmations and retains read-only versions', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.status = 'Draft';
    course.sample = false;
    course.code = 'CVTA-PUBLISH-UI';
    course.outcomes = 'Apply the approved knowledge safely.';
    course.targetRoles = [store.staff()[0].role];
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const beforeAssignments = academy.assignments().length;
    const harness = await RouterTestingHarness.create('/manage/learning/publish/' + course.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const fill = (label: string, value: string) => {
      const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[aria-label="' + label + '"]',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    expect(page.querySelector('.publish-blocker')?.textContent).toContain('Complete course code');
    fill('Publication course owner', 'Training Lead');
    fill('Publication issuer', 'CareVerity Academy');
    fill('Publication approver', 'Approved Training Manager');
    fill('Publication effective date', londonDate());
    fill('Publication content rights', 'Provider-owned training content');
    fill('Publication version notes', 'Reviewed release for staff learning');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.publish-blocker')).toBeNull();
    const confirmation = page.querySelector<HTMLInputElement>(
      '[aria-label="Confirm publication approval"]',
    )!;
    confirmation.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(false);
    fill('Publication issuer', 'CareVerity Approved Issuer');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(confirmation.checked).toBe(false);
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(true);
    confirmation.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('.publish-action')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.publication-success')?.textContent).toContain('published');
    expect(page.querySelector('[role="alert"]')).toBeNull();
    const published = academy.state().courses.find((c) => c.id === course.id)!;
    expect(published.status).toBe('Published');
    expect(published.issuer).toBe('CareVerity Approved Issuer');
    expect(published.publishedBy).toBe(actor().name);
    expect(published.publicationNote).toBe('Reviewed release for staff learning');
    expect(academy.assignments()).toHaveLength(beforeAssignments);
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(true);
    expect(page.querySelectorAll('.publication-history tbody tr')).toHaveLength(2);
    page
      .querySelector<HTMLButtonElement>(
        '[aria-label="View published version ' + course.version + '"]',
      )!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.version-dialog')?.textContent).toContain('Read-only');
    expect(page.querySelector('.version-dialog input')).toBeNull();
    expect(
      academy
        .state()
        .courseVersions?.find((c) => c.id === course.id && c.version === course.version)?.sample,
    ).toBe(true);
  });
  it('resets publication approval when the approved bank changes and blocks stale draft publication', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.status = 'Draft';
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const harness = await RouterTestingHarness.create('/manage/learning/publish/' + course.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const confirmation = page.querySelector<HTMLInputElement>(
      '[aria-label="Confirm publication approval"]',
    )!;
    confirmation.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(false);
    const q = structuredClone(academy.state().questions.find((q) => q.courseId === course.id)!);
    q.text = 'New approved answer-key version';
    expect(academy.saveQuestion(q, 'lqcs', q.updatedAt)).toBeNull();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(confirmation.checked).toBe(false);
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(true);
    confirmation.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const external = structuredClone(academy.course(course.id)!);
    external.description += ' Updated in another editor.';
    expect(academy.saveCourse(external, 'lqcs', external.updatedAt)).toBeNull();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.publish-blocker')?.textContent).toContain('changed');
    expect(page.querySelector<HTMLButtonElement>('.publish-action')!.disabled).toBe(true);
    expect(academy.state().courseVersions).toBeUndefined();
  });
  it('publishes an inactive version without claiming it is available for staff assignment', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.status = 'Draft';
    course.active = false;
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const harness = await RouterTestingHarness.create('/manage/learning/publish/' + course.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(
      page.querySelector<HTMLInputElement>('[aria-label="Course active for assignments"]')?.checked,
    ).toBe(false);
    page.querySelector<HTMLInputElement>('[aria-label="Confirm publication approval"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('.publish-action')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.publication-success')?.textContent).toContain(
      'inactive for new assignments',
    );
    expect(page.querySelector('.course-review .status-pill')?.textContent).toContain('Inactive');
    expect(academy.state().courses.find((c) => c.id === course.id)?.active).toBe(false);
  });
});
