import { TestBed } from '@angular/core/testing';
import {
  EnvironmentInjector,
  createEnvironmentInjector,
  createComponent,
  signal,
  runInInjectionContext,
} from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyMyLearningApi } from './academy-my-learning-api.service';
import { ACADEMY_LEARNER_PROVIDERS } from './academy-learner.providers';
import { AcademyService } from './academy.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyMyCoursesApi } from './academy-my-courses-api.service';
import { AcademyAssessment } from './academy-assessment';
import { AcademyLearner } from './academy-learner';

const person = {
  id: 'worker',
  name: 'Linked Worker',
  email: 'worker@example.test',
  role: 'Care Worker',
  location: 'North',
  department: 'Care',
  status: 'Active',
};
const course: any = {
  id: 'course',
  company_id: 'north',
  title: 'My assigned course',
  description: 'Recorded course',
  status: 'Published',
  active: true,
  category: 'Mandatory',
  mandatory: true,
  cpdHours: 1,
  lessons: [{ id: 'lesson', title: 'First lesson', handoutIds: [] }],
  policy: {},
  targetBranches: [],
};
const assignment: any = {
  id: 'assignment',
  company_id: 'north',
  personId: 'worker',
  courseId: 'course',
  courseSnapshot: course,
  completedLessonIds: [],
  completedAt: '',
  assignedAt: '2026-11-01T12:00:00Z',
  due: '2026-11-14',
  archived: false,
  notes: {},
  version: 1,
};
const learning: any = { assignment, assets: [], attempts: [], retakePlans: [], person };
const summary = (): any => ({
  company_id: 'north',
  actor_id: '12',
  company: { id: 'north', name: 'North Care', code: 'NORTH' },
  staff: {
    id: 'worker',
    employment_id: 'employment',
    name: 'Linked Worker',
    email: 'worker@example.test',
  },
  meta: { local_date: '2026-11-13', timezone: 'Europe/London', as_of: '2026-11-13T12:00:00Z' },
  stats: { assigned: 1, due_soon: 1, completed: 0, overdue: 0, average_score: null },
  statuses: { assignment: 'Due soon' },
  deadline_ids: ['assignment'],
  recent_attempt_ids: [],
  latest_certificate_id: null,
});

describe('My learning staff-only records', () => {
  let child: EnvironmentInjector,
    api: AcademyMyLearningApi,
    request: ReturnType<typeof vi.fn<(path: string, ...args: any[]) => Promise<any>>>,
    company: ReturnType<typeof signal<string>>,
    actor: ReturnType<typeof signal<any>>;
  beforeEach(() => {
    company = signal('north');
    actor = signal({ id: '12' });
    request = vi.fn(async (path: string) => {
      if (path.endsWith('/learning/dashboard')) return summary();
      if (path.includes('/academy/learning?'))
        return {
          count: 1,
          next: null,
          results: [learning],
          meta: { company_id: 'north', person, dueSoonDays: 30 },
        };
      if (path.includes('/learning/messages?'))
        return {
          count: 0,
          next: null,
          results: [],
          meta: { company_id: 'north', actor_id: '12', person_id: 'worker', can_acknowledge: true },
        };
      if (path.includes('/learning/'))
        return { count: 0, next: null, results: [], meta: { company_id: 'north' } };
      throw Error('Unexpected management request: ' + path);
    });
    const params = convertToParamMap({}),
      query = convertToParamMap({ person: 'private-worker', preview: '1' }),
      data = { view: 'dashboard' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            api: request,
            profile: actor,
            currentUser: () => ({
              id: actor().id,
              email: 'worker@example.test',
              name: 'Account name',
              roleCode: 'CA',
            }),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => ({
              revision: 1,
              company_active: true,
              permissions: [],
              enabled_modules: [],
              roles: [],
            }),
            can: () => true,
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companyId: company,
            company: () => ({ id: 'north', name: 'North Care' }),
            staff: () => [{ id: 'private-worker', name: 'Other employee private record' }],
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: params, queryParamMap: query, data },
            paramMap: of(params),
            queryParamMap: of(query),
            data: of(data),
          },
        },
      ],
    });
    child = createEnvironmentInjector(
      ACADEMY_LEARNER_PROVIDERS,
      TestBed.inject(EnvironmentInjector),
    );
    api = child.get(AcademyMyLearningApi);
    TestBed.tick();
  });
  afterEach(() => {
    child.destroy();
    TestBed.resetTestingModule();
  });
  it('loads only learner endpoints and verifies the linked employee identity', async () => {
    await api.load();
    expect(api.error()).toBe('');
    expect(api.snapshot()?.staff.id).toBe('worker');
    expect(request.mock.calls.every((call) => call[0].includes('/academy/learning'))).toBe(true);
    expect(child.get(AcademyService).canManage()).toBe(false);
    expect(child.get(AcademyResultsApi).available()).toBe(false);
  });
  it('keeps a cached administrator result outside the staff route injector', async () => {
    const parent = TestBed.inject(AcademyResultsApi) as any;
    parent.records.set([
      {
        assignment: { ...assignment, id: 'private-assignment', personId: 'private-worker' },
        history: [],
        assets: [],
        retakePlans: [],
        person: { ...person, id: 'private-worker' },
      },
    ]);
    parent.resultScope.set(parent.scope());
    expect(TestBed.inject(AcademyService).assignments()[0].personId).toBe('private-worker');
    await api.load();
    expect(
      child
        .get(AcademyService)
        .assignments()
        .map((a) => a.personId),
    ).toEqual(['worker']);
    expect(child.get(AcademyService)).not.toBe(TestBed.inject(AcademyService));
  });
  it('renders the existing learning cards without the staff preview selector', async () => {
    await api.load();
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('Hello, Linked Worker');
    expect(host.textContent).toContain('My assigned course');
    expect(host.textContent).not.toContain('Other employee private record');
    expect(host.querySelector('[aria-label="Preview staff learning"]')).toBeNull();
    expect(host.querySelectorAll('.stats .stat')).toHaveLength(5);
    expect((ref.instance as any).person().id).toBe('worker');
    ref.destroy();
  });
  it('renders assigned and eligible optional courses with working search and category filters', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/courses')
        ? {
            company_id: 'north',
            actor_id: '12',
            person_id: 'worker',
            allow_self_enrolment: true,
            results: [
              { course, assignment_id: 'assignment', can_enrol: false, assets: [] },
              {
                course: {
                  ...course,
                  id: 'optional',
                  title: 'Optional professional learning',
                  mandatory: false,
                  category: 'Professional',
                },
                assignment_id: null,
                can_enrol: true,
                assets: [],
              },
            ],
          }
        : original(path),
    );
    await api.load(true);
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'courses';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.querySelectorAll('.course-card')).toHaveLength(2);
    expect(host.textContent).toContain('My courses');
    expect(host.querySelector('[aria-label="Preview staff learning"]')).toBeNull();
    (ref.instance as any).search.set('optional');
    ref.changeDetectorRef.markForCheck();
    ref.changeDetectorRef.detectChanges();
    expect(host.querySelectorAll('.course-card')).toHaveLength(1);
    expect(host.querySelector('.course-card')?.textContent).toContain(
      'Optional professional learning',
    );
    (ref.instance as any).search.set('');
    (ref.instance as any).category.set('Mandatory');
    ref.changeDetectorRef.markForCheck();
    ref.changeDetectorRef.detectChanges();
    expect(host.querySelectorAll('.course-card')).toHaveLength(1);
    expect(host.querySelector('.course-card')?.textContent).toContain('My assigned course');
    (ref.instance as any).search.set('No matching course');
    ref.changeDetectorRef.markForCheck();
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('No published courses match this search.');
    ref.destroy();
  });
  it('blocks the course page if its catalogue belongs to another employee', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/courses')
        ? {
            company_id: 'north',
            actor_id: '12',
            person_id: 'other-worker',
            results: [],
          }
        : original(path),
    );
    await api.load(true);
    expect(api.snapshot()).toBeNull();
    expect(api.error()).toContain('current staff account');
  });
  it.each([
    ['staff_not_linked', 'Link your staff account to continue'],
    ['staff_inactive', 'Your staff record is inactive'],
  ])('renders branded %s errors without learning records', async (code, title) => {
    request.mockRejectedValue(
      Object.assign(new Error('Ask your manager to review your staff account.'), {
        code,
        status: 403,
      }),
    );
    await api.load();
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain(title);
    expect(host.querySelector('.stats')).toBeNull();
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Ask your manager');
    expect(request).toHaveBeenCalledTimes(1);
    ref.destroy();
  });
  it('rejects a mismatched employee response instead of merging staff records', async () => {
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/dashboard')
        ? { ...summary(), staff: { ...summary().staff, id: 'private-worker' } }
        : path.includes('/academy/learning?')
          ? { next: null, results: [learning], meta: { company_id: 'north', person } }
          : {
              count: 0,
              next: null,
              results: [],
              meta: {
                company_id: 'north',
                actor_id: '12',
                person_id: 'worker',
                can_acknowledge: true,
              },
            },
    );
    await api.load();
    expect(api.snapshot()).toBeNull();
    expect(api.error()).toContain('context changed');
  });
  it('keeps an assigned course visible after a branch transfer', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) => {
      const value = await original(path);
      if (path.includes('/academy/learning?'))
        return {
          ...value,
          results: [
            {
              ...learning,
              assignment: {
                ...assignment,
                courseSnapshot: { ...course, targetBranches: ['Former branch'] },
              },
            },
          ],
        };
      return value;
    });
    await api.load();
    const academy = child.get(AcademyService);
    expect(api.snapshot()?.stats.assigned).toBe(1);
    expect(academy.canBrowseCourse(academy.course('course')!)).toBe(true);
    expect(academy.course('course')?.title).toBe('My assigned course');
  });
  it.each([
    { stats: { ...summary().stats, assigned: 2 } },
    { stats: { ...summary().stats, completed: 1 } },
    { statuses: { 'missing-assignment': 'Assigned' } },
    { recent_attempt_ids: ['missing-attempt'] },
    { latest_certificate_id: 'missing-certificate' },
  ])(
    'rejects summary totals or references that disagree with loaded records: %o',
    async (change) => {
      const original = request.getMockImplementation()!;
      request.mockImplementation(async (path: string) =>
        path.endsWith('/learning/dashboard') ? { ...summary(), ...change } : original(path),
      );
      await api.load();
      expect(api.snapshot()).toBeNull();
      expect(api.error()).toContain('records changed');
    },
  );
  it('hides the old snapshot while its source records refresh', async () => {
    await api.load();
    const original = request.getMockImplementation()!;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    let started!: () => void;
    const waiting = new Promise<void>((resolve) => (started = resolve));
    request.mockImplementation(async (path: string) => {
      if (path.includes('/academy/learning?')) {
        started();
        await hold;
      }
      return original(path);
    });
    const refresh = api.load();
    await waiting;
    expect(api.snapshot()).toBeNull();
    expect(api.loading()).toBe(true);
    release();
    await refresh;
    expect(api.snapshot()?.stats.assigned).toBe(1);
  });
  it('clears the previous actor immediately when the account changes', async () => {
    await api.load();
    actor.set({ id: '13' });
    expect(api.snapshot()).toBeNull();
  });
  it.each([
    [0, '', '', false],
    [30, new Date(Date.now() + 600000).toISOString(), '', false],
    [30, new Date(Date.now() - 600000).toISOString(), '', true],
    [0, '', 'This learning cycle is archived.', false],
  ])(
    'handles an assessment time limit of %s without premature or repeated submission',
    async (minutes, deadline, reason, shouldSubmit) => {
      const attempt = {
        id: 'attempt',
        company_id: 'north',
        personId: 'worker',
        assignmentId: 'assignment',
        courseId: 'course',
        policy: { timeLimitMinutes: minutes },
        deadline,
        submittedAt: '',
        questions: [],
        answers: {},
        flags: [],
        availability: { reason },
      };
      const original = request.getMockImplementation()!;
      request.mockImplementation(async (path: string) =>
        path.includes('/academy/learning?')
          ? {
              count: 1,
              next: null,
              results: [{ ...learning, attempts: [attempt] }],
              meta: { company_id: 'north', person },
            }
          : original(path),
      );
      await api.load();
      const route = TestBed.inject(ActivatedRoute) as any;
      route.snapshot.paramMap = convertToParamMap({ attemptId: 'attempt' });
      route.paramMap = of(route.snapshot.paramMap);
      const academy = child.get(AcademyService);
      const submit = vi.spyOn(academy, 'submit').mockResolvedValue('Verification submission');
      vi.spyOn(api, 'load').mockResolvedValue();
      const component = runInInjectionContext(child, () => new AcademyAssessment());
      TestBed.tick();
      expect(submit).toHaveBeenCalledTimes(shouldSubmit ? 1 : 0);
      expect((component as any).canEdit()).toBe(!shouldSubmit && !reason);
      expect((component as any).canSubmit()).toBe(!reason);
      TestBed.tick();
      expect(submit).toHaveBeenCalledTimes(shouldSubmit ? 1 : 0);
    },
  );
  it('allows retrying saved responses after an expired assessment submission fails', async () => {
    const attempt = {
      id: 'attempt',
      company_id: 'north',
      personId: 'worker',
      assignmentId: 'assignment',
      courseId: 'course',
      policy: { timeLimitMinutes: 30 },
      deadline: new Date(Date.now() - 60000).toISOString(),
      submittedAt: '',
      questions: [],
      answers: {},
      flags: [],
      availability: { reason: '' },
    };
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.includes('/academy/learning?')
        ? {
            count: 1,
            next: null,
            results: [{ ...learning, attempts: [attempt] }],
            meta: { company_id: 'north', person },
          }
        : original(path),
    );
    await api.load();
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.paramMap = convertToParamMap({ attemptId: 'attempt' });
    route.paramMap = of(route.snapshot.paramMap);
    const submit = vi
      .spyOn(child.get(AcademyService), 'submit')
      .mockResolvedValueOnce('Connection interrupted')
      .mockResolvedValueOnce(null);
    const reload = vi.spyOn(api, 'load').mockResolvedValue();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const component = runInInjectionContext(child, () => new AcademyAssessment());
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith(false, true);
    expect((component as any).canEdit()).toBe(false);
    expect((component as any).canSubmit()).toBe(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await (component as any).submit();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/staff-portal/training/results', 'attempt']);
  });
  it.each([
    ['staff_inactive', 'Your staff record is inactive'],
    ['staff_not_linked', 'Link your staff account to continue'],
  ])(
    'shows the branded %s error when opening an assessment from My learning',
    async (code, title) => {
      request.mockRejectedValue(
        Object.assign(new Error('Ask your manager to review your staff account.'), {
          code,
          status: 403,
        }),
      );
      await api.load();
      const host = document.createElement('div');
      const ref = createComponent(AcademyAssessment, {
        environmentInjector: child,
        hostElement: host,
      });
      ref.changeDetectorRef.detectChanges();
      expect(host.textContent).toContain(title);
      expect(host.textContent).not.toContain('Assessment unavailable');
      expect(host.querySelector('.quiz-submit-bar')).toBeNull();
      ref.destroy();
    },
  );
  it('reviews completed lessons and downloads resources without attempting learning writes', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/dashboard')
        ? {
            ...summary(),
            stats: { ...summary().stats, completed: 1 },
            statuses: { assignment: 'Completed' },
            deadline_ids: [],
          }
        : path.includes('/academy/learning?')
          ? {
              count: 1,
              next: null,
              results: [
                {
                  ...learning,
                  assignment: {
                    ...assignment,
                    completedAt: '2026-11-13T12:00:00Z',
                    availability: {
                      '': {
                        remaining: 0,
                        readyAt: '',
                        runningId: '',
                        reason: 'This learning cycle is complete.',
                      },
                    },
                    completedLessonIds: ['lesson'],
                    notes: { lesson: 'Saved before completion' },
                  },
                },
              ],
              meta: { company_id: 'north', person },
            }
          : original(path),
    );
    await api.load();
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.paramMap = convertToParamMap({ courseId: 'course', lessonId: 'lesson' });
    route.paramMap = of(route.snapshot.paramMap);
    route.snapshot.data['view'] = 'lesson';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    ref.changeDetectorRef.detectChanges();
    expect((ref.instance as any).canRecordLearning()).toBe(false);
    const notes = host.querySelector(
      'textarea[aria-label="My lesson notes"]',
    ) as HTMLTextAreaElement;
    expect(notes.disabled).toBe(true);
    expect(notes.value).toBe('Saved before completion');
    const files = vi.spyOn(child.get(AcademyAssets), 'download').mockResolvedValue();
    const record = vi.spyOn(child.get(AcademyService), 'recordResourceOpen');
    await (ref.instance as any).download('resource');
    expect(files).toHaveBeenCalledWith('resource');
    expect(record).not.toHaveBeenCalled();
    (ref.instance as any).editNote('Cannot overwrite a completed cycle');
    expect((ref.instance as any).notePending()).toBe(false);
    expect((ref.instance as any).note).toBe('Saved before completion');
    ref.destroy();
  });
  it('renders only own assessment history and prevents resuming an archived attempt', async () => {
    const attempt = {
      id: 'attempt',
      company_id: 'north',
      personId: 'worker',
      assignmentId: 'assignment',
      courseId: 'course',
      courseTitle: 'My assigned course',
      startedAt: '2026-11-13T12:00:00Z',
      submittedAt: '',
      passed: false,
      score: null,
    };
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/assessments')
        ? {
            company_id: 'north',
            actor_id: '12',
            person_id: 'worker',
            can_start: true,
            can_edit: true,
            assignment_ids: ['assignment'],
            attempts: [
              {
                id: 'attempt',
                assignment_id: 'assignment',
                status: 'Unavailable',
                action: 'unavailable',
                reason: 'This learning cycle is archived.',
              },
            ],
          }
        : path.includes('/academy/learning?')
          ? {
              count: 1,
              next: null,
              results: [{ ...learning, attempts: [attempt] }],
              meta: { company_id: 'north', person },
            }
          : original(path),
    );
    await api.load(false, true);
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'assessments';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('My assessments');
    expect(host.textContent).toContain('My assigned course');
    const disabled = host.querySelector('a[aria-disabled="true"]');
    expect(disabled?.textContent).toContain('Unavailable');
    expect(disabled?.getAttribute('href')).toBeNull();
    expect(disabled?.getAttribute('title')).toContain('archived');
    expect(host.textContent).not.toContain('Other employee private record');
    expect(host.textContent).not.toContain('Resume assessment');
    ref.destroy();
  });
  it('uses staff-scoped attempt endpoints when starting and answering from a staff route', async () => {
    await api.load();
    const records = child.get(AcademyResultsApi);
    const original = request.getMockImplementation()!;
    const attempt = {
      id: 'attempt',
      company_id: 'north',
      personId: 'worker',
      assignmentId: 'assignment',
      courseId: 'course',
      questions: [],
      answers: {},
      flags: [],
      etag: '"v1"',
      version: 1,
      policy: {},
    };
    request.mockImplementation(async (path: string) =>
      path.includes('/learning/assessments/attempts')
        ? {
            attempt,
            assignment,
            history: [attempt],
            assets: [],
            retakePlans: [],
            person,
            integrations: { available: false, reason: '' },
          }
        : original(path),
    );
    await records.start('assignment');
    await records.detail('attempt', true);
    await records.answer('attempt', 'question', ['a'], null);
    await records.submit('attempt');
    const paths = request.mock.calls.map((call) => call[0]);
    expect(paths).toContain('/companies/north/academy/learning/assessments/attempts');
    expect(paths).toContain('/companies/north/academy/learning/assessments/attempts/attempt');
    expect(paths).toContain(
      '/companies/north/academy/learning/assessments/attempts/attempt/submit',
    );
    expect(paths.some((path) => path.includes('/learning/attempts'))).toBe(false);
  });
  it('renders the original training cycle and its server evidence status in the existing table', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) =>
      path.endsWith('/learning/training-record')
        ? {
            company_id: 'north',
            actor_id: '12',
            person_id: 'worker',
            can_request_records: true,
            rows: [
              {
                id: 'assignment',
                course_id: 'course',
                course_version: 2,
                course_title: 'Pinned training title',
                cycle: 'Initial',
                archived: false,
                due: assignment.due,
                completed_at: null,
                attempt_id: null,
                result_label: 'Assigned',
                result_action: 'none',
                result_reason: '',
                certificate_id: null,
                certificate_state: null,
                evidence_status: 'Not yet completed',
              },
            ],
            certificate_ids: [],
            requests: [],
          }
        : path.includes('/academy/learning?')
          ? {
              count: 1,
              next: null,
              results: [{ ...learning, assignment: { ...assignment, courseVersion: 2 } }],
              meta: { company_id: 'north', person },
            }
          : original(path),
    );
    await api.load(false, false, true);
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'history';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('My training record');
    expect(host.textContent).toContain('Pinned training title');
    expect(host.textContent).toContain('Version 2');
    expect(host.textContent).toContain('Not yet completed');
    expect(host.querySelectorAll('table thead th')).toHaveLength(5);
    expect(host.textContent).not.toContain('Other employee private record');
    expect(host.querySelector('[aria-label="Preview staff learning"]')).toBeNull();
    child.get(AcademyService).certificatesApi.saving.set(true);
    expect(await ref.instance.canLeave()).toBe(false);
    ref.destroy();
  });
  it('sends a staff-scoped records request and refreshes the awaiting-HR state', async () => {
    const original = request.getMockImplementation()!;
    let created = false;
    const accessRequest = {
      id: 'request',
      company_id: 'north',
      tenantId: 'north',
      personId: 'worker',
      status: 'Requested',
      etag: '"v1"',
      version: 1,
      createdAt: '2026-11-13T12:00:00Z',
      acknowledgedAt: '',
      acknowledgedBy: '',
      decision: '',
      deliveryReference: '',
      completedAt: '',
    };
    const row = {
      id: 'assignment',
      course_id: 'course',
      course_version: 2,
      course_title: 'Pinned training title',
      cycle: 'Initial',
      archived: false,
      due: assignment.due,
      completed_at: null,
      attempt_id: null,
      result_label: 'Assigned',
      result_action: 'none',
      result_reason: '',
      certificate_id: null,
      certificate_state: null,
      evidence_status: 'Not yet completed',
    };
    request.mockImplementation(async (path: string, ...args: any[]) => {
      if (path.endsWith('/training-record/records-requests') && args[1] === 'POST') {
        created = true;
        return accessRequest;
      }
      if (path.includes('/training-record/records-requests?'))
        return {
          count: created ? 1 : 0,
          next: null,
          results: created ? [accessRequest] : [],
          meta: { company_id: 'north' },
        };
      if (path.endsWith('/learning/training-record'))
        return {
          company_id: 'north',
          actor_id: '12',
          person_id: 'worker',
          can_request_records: true,
          rows: [row],
          certificate_ids: [],
          requests: created ? [accessRequest] : [],
        };
      if (path.includes('/academy/learning?'))
        return {
          count: 1,
          next: null,
          results: [{ ...learning, assignment: { ...assignment, courseVersion: 2 } }],
          meta: { company_id: 'north', person },
        };
      return original(path);
    });
    await api.load(false, false, true);
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'history';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    await (ref.instance as any).requestRecords();
    ref.changeDetectorRef.markForCheck();
    ref.changeDetectorRef.detectChanges();
    expect((ref.instance as any).pendingRequest()).toBe(true);
    expect(host.textContent).toContain('Records access request awaiting HR');
    expect(request).toHaveBeenCalledWith(
      '/companies/north/academy/learning/training-record/records-requests',
      {},
      'POST',
      { 'Idempotency-Key': expect.any(String) },
    );
    ref.destroy();
  });
  it('prevents leaving a course while its enrolment is still being saved', async () => {
    await api.load();
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    const courses = child.get(AcademyMyCoursesApi);
    courses.saving.set(true);
    expect(await ref.instance.canLeave()).toBe(false);
    courses.saving.set(false);
    expect(await ref.instance.canLeave()).toBe(true);
    ref.destroy();
  });
  it('discards a late response after leaving My learning', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = api.load();
    api.stop();
    finish(summary());
    await pending;
    expect(api.snapshot()).toBeNull();
  });
  it('renders server-selected refreshers and keeps the existing course navigation', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) => {
      if (path.endsWith('/learning/refreshers'))
        return {
          company_id: 'north',
          actor_id: '12',
          person_id: 'worker',
          meta: summary().meta,
          assignment_ids: ['assignment'],
          certificate_ids: [],
          reviews: [],
          assignments: [
            {
              id: 'assignment',
              course_id: 'course',
              course_version: 2,
              course_title: 'Published refresher title',
              cycle: 'Refresher',
              due: assignment.due,
              status: 'Due soon',
              can_continue: true,
              reason: '',
            },
          ],
        };
      if (path.includes('/academy/learning?'))
        return {
          count: 1,
          next: null,
          results: [
            { ...learning, assignment: { ...assignment, courseVersion: 2, type: 'Refresher' } },
          ],
          meta: { company_id: 'north', person },
        };
      return original(path);
    });
    await api.load(false, false, false, true);
    expect(api.error()).toBe('');
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'refreshers';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('Required refreshers & due training');
    expect(host.textContent).toContain('Published refresher title');
    expect(host.textContent).toContain('Due soon');
    expect(host.querySelector('a[href="/staff-portal/training/courses/course"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Other employee private record');
    expect(host.textContent).toContain('No recorded completion renewals');
    ref.destroy();
  });
  it('shows a branded inactive-staff message when the refresher source denies access', async () => {
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path: string) => {
      if (path.endsWith('/learning/refreshers'))
        throw Object.assign(Error('Your staff record is inactive. Contact HR for help.'), {
          code: 'staff_inactive',
          status: 403,
        });
      return original(path);
    });
    await api.load(false, false, false, true);
    expect(api.snapshot()).toBeNull();
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'refreshers';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('Your staff record is inactive');
    expect(host.textContent).toContain('Try again');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Contact HR');
    expect(host.textContent).not.toContain('Published refresher title');
    ref.destroy();
  });
  it.each([false, true])(
    'renders and acknowledges saved training messages with the original course link (lost response: %s)',
    async (loseResponse) => {
      const original = request.getMockImplementation()!;
      let acknowledged = false;
      const message = () => ({
        id: 'message',
        company_id: 'north',
        version: acknowledged ? 2 : 1,
        etag: acknowledged ? '"v2"' : '"v1"',
        assignmentId: 'assignment',
        personId: 'worker',
        title: 'Pinned message course',
        text: 'Please review your refresher training.',
        channel: 'In-platform',
        status: acknowledged ? 'Delivered' : 'Queued',
        attempts: 0,
        nextAttemptAt: '',
        at: '2026-11-13T12:00:00Z',
        updatedAt: '2026-11-13T12:00:00Z',
        providerId: '',
        error: '',
        history: [],
        course_id: 'course',
        course_reason: '',
      });
      request.mockImplementation(async (path: string, ...args: any[]) => {
        if (path.endsWith('/learning/messages/message/acknowledge')) {
          acknowledged = true;
          if (loseResponse) throw Error('Connection interrupted after acknowledgement');
          return message();
        }
        if (path.includes('/learning/messages?'))
          return {
            count: 1,
            next: null,
            results: [message()],
            meta: {
              company_id: 'north',
              actor_id: '12',
              person_id: 'worker',
              can_acknowledge: true,
            },
          };
        return original(path, ...args);
      });
      await api.load();
      expect(api.error()).toBe('');
      TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'messages';
      const host = document.createElement('div');
      const ref = createComponent(AcademyLearner, {
        environmentInjector: child,
        hostElement: host,
      });
      ref.changeDetectorRef.detectChanges();
      expect(host.textContent).toContain('Training messages & reminders');
      expect(host.textContent).toContain('Please review your refresher training.');
      expect(host.querySelector('a[href="/staff-portal/training/courses/course"]')).not.toBeNull();
      await (ref.instance as any).acknowledgeNotification('message');
      ref.changeDetectorRef.markForCheck();
      ref.changeDetectorRef.detectChanges();
      expect(host.textContent).toContain('Message acknowledged');
      expect(host.querySelector<HTMLButtonElement>('article button')?.disabled).toBe(true);
      const governance = child.get(AcademyService).governanceApi;
      governance.saving.set(true);
      expect(await ref.instance.canLeave()).toBe(false);
      governance.saving.set(false);
      ref.destroy();
    },
  );
  it('keeps an empty training inbox explicit and separate from other staff records', async () => {
    await api.load();
    TestBed.inject(ActivatedRoute).snapshot.data['view'] = 'messages';
    const host = document.createElement('div');
    const ref = createComponent(AcademyLearner, { environmentInjector: child, hostElement: host });
    ref.changeDetectorRef.detectChanges();
    expect(host.textContent).toContain('No training messages yet.');
    expect(host.textContent).not.toContain('Other employee private record');
    ref.destroy();
  });
});
