import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AcademyApi, CourseRecord } from './academy-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ManagementStore } from '../../shared/management.store';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyCourse } from './academy.models';

const course = (id = 'course-one'): AcademyCourse & { company_id: string; etag: string } => ({
  id,
  company_id: 'company-one',
  etag: '"v1"',
  title: 'Safeguarding',
  code: 'SAFE-001',
  description: 'Report concerns',
  category: 'Mandatory',
  mandatory: true,
  cpdHours: 1,
  passMark: 80,
  validityMonths: 12,
  status: 'Draft',
  sample: false,
  thumbnailId: '',
  lessons: [],
  modules: [],
  version: 1,
  updatedAt: '2026-11-12T10:00:00Z',
});
const record = (id?: string): CourseRecord => ({
  course: course(id),
  published: null,
  questions: [],
  versions: [],
});

describe('Academy API authoring persistence', () => {
  const companyId = signal('company-one'),
    allowed = signal(true),
    context = signal<{ revision: number; request_id?: string }>({ revision: 1 });
  let api: AcademyApi;
  let request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    companyId.set('company-one');
    allowed.set(true);
    context.set({ revision: 1 });
    request = vi
      .fn()
      .mockImplementation(async (path: string) =>
        path.includes('/media')
          ? { company_id: 'company-one', results: [] }
          : { results: [], next: null, meta: { company_id: 'company-one' } },
      );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'actor' }), api: request } },
        { provide: ManagementStore, useValue: { companyId } },
        { provide: CompanyAccessService, useValue: { context, can: () => allowed() } },
      ],
    });
    api = TestBed.inject(AcademyApi);
  });
  it('creates a server identified draft and sends only editable source fields', async () => {
    await api.load();
    request.mockResolvedValueOnce(record('server-course'));
    const draft = course('local-key');
    draft.version = 0;
    draft.updatedAt = '';
    const saved = await api.save(draft, '');
    expect(saved.course.id).toBe('server-course');
    const [path, body, method, headers] = request.mock.calls.at(-1)!;
    expect(path).toBe('/companies/company-one/academy/courses');
    expect(method).toBe('POST');
    expect(headers).toEqual({ 'Idempotency-Key': 'local-key' });
    expect(body).not.toHaveProperty('company_id');
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('id');
    expect(api.courses()[0].course.title).toBe('Safeguarding');
  });
  it('awaits saves, sends If-Match and uses the publish command', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'company-one' },
    });
    await api.load();
    let resolve!: (value: CourseRecord) => void;
    request.mockReturnValueOnce(new Promise<CourseRecord>((done) => (resolve = done)));
    const draft = { ...course(), title: 'Changed' };
    const pending = api.save(draft, draft.updatedAt);
    expect(api.courses()[0].course.title).toBe('Safeguarding');
    expect(request.mock.calls.at(-1)![2]).toBe('PATCH');
    expect(request.mock.calls.at(-1)![3]).toEqual({ 'If-Match': '"v1"' });
    const next = record();
    next.course = { ...draft, etag: '"v2"', version: 2 };
    resolve(next);
    await pending;
    expect(api.courses()[0].course.title).toBe('Changed');
    request.mockResolvedValueOnce(next);
    await api.save({ ...next.course, status: 'Published' }, next.course.updatedAt);
    expect(request.mock.calls.at(-1)![0]).toMatch(/\/courses\/course-one\/publish$/);
    expect(request.mock.calls.at(-1)![2]).toBe('POST');
  });
  it('clears old records immediately on workspace and permission changes', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'company-one' },
    });
    await api.load();
    expect(api.courses()).toHaveLength(1);
    companyId.set('company-two');
    expect(api.courses()).toHaveLength(0);
    companyId.set('company-one');
    allowed.set(false);
    expect(api.courses()).toHaveLength(0);
    await expect(api.load()).rejects.toThrow('unavailable');
  });
  it('keeps records across identical permission polls and invalidates a changed access revision', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'company-one' },
    });
    await api.load();
    const scope = api.scope();
    context.set({ revision: 1, request_id: 'new-poll-request' });
    expect(api.scope()).toBe(scope);
    expect(api.courses()).toHaveLength(1);
    context.set({ revision: 2, request_id: 'access-change' });
    expect(api.courses()).toEqual([]);
  });
  it('rejects late responses from an old company', async () => {
    let resolve!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const pending = api.load();
    companyId.set('company-two');
    resolve({ results: [record()], next: null, meta: { company_id: 'company-one' } });
    await expect(pending).rejects.toThrow('workspace');
    expect(api.courses()).toEqual([]);
  });
  it('shows failed loads and does not fall back to old browser records', async () => {
    request.mockRejectedValueOnce(Error('Service unavailable'));
    await expect(api.load()).rejects.toThrow('Service unavailable');
    expect(api.error()).toBe('Service unavailable');
    expect(api.courses()).toEqual([]);
  });
  it('does not report a rejected or stale save as a success', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'company-one' },
    });
    await api.load();
    await expect(api.save(course(), 'older-version')).rejects.toThrow('changed');
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.save(course(), course().updatedAt)).rejects.toThrow('Access revoked');
    expect(api.courses()).toEqual([]);
  });
  it('freezes nested module and lesson inputs when a save starts', async () => {
    await api.load();
    let resolve!: (value: CourseRecord) => void;
    request.mockReturnValueOnce(new Promise<CourseRecord>((done) => (resolve = done)));
    const draft = {
      ...course('local-key'),
      modules: [{ id: 'module-one', title: 'Reviewed module' }],
      lessons: [],
    };
    const pending = api.save(draft, '');
    const body = request.mock.calls.at(-1)![1];
    draft.modules[0].title = 'Changed while saving';
    const submittedTitle = body.modules[0].title;
    resolve(record('server-course'));
    await pending;
    expect(submittedTitle).toBe('Reviewed module');
  });

  it('blocks overlapping saves and releases the form after a failed request', async () => {
    await api.load();
    let reject!: (reason: Error) => void;
    request.mockReturnValueOnce(new Promise<CourseRecord>((_, fail) => (reject = fail)));
    const pending = api.save(course('local-one'), '');
    expect(api.saving()).toBe(true);
    await expect(api.save(course('local-two'), '')).rejects.toThrow('already in progress');
    expect(api.saving()).toBe(true);
    reject(Error('Connection failed'));
    await expect(pending).rejects.toThrow('Connection failed');
    expect(api.saving()).toBe(false);
  });
  it('freezes question options and checkpoint inputs until the bank request completes', async () => {
    request.mockResolvedValueOnce({
      results: [record()],
      next: null,
      meta: { company_id: 'company-one' },
    });
    await api.load();
    let resolve!: (value: CourseRecord) => void;
    request.mockReturnValueOnce(new Promise<CourseRecord>((done) => (resolve = done)));
    const question = {
      id: 'q-one',
      courseId: 'course-one',
      lessonId: 'lesson-one',
      type: 'Single choice' as const,
      text: 'Who receives the concern?',
      scenario: '',
      category: 'Safety',
      difficulty: 'Easy' as const,
      weight: 1,
      required: true,
      shuffle: true,
      imageId: '',
      options: [{ id: 'a', text: 'Safeguarding lead' }],
      correctIds: ['a'],
      explanation: 'Report promptly',
      correctFeedback: '',
      incorrectFeedback: '',
      tags: [],
      status: 'Draft' as const,
      version: 0,
      updatedAt: '',
    };
    const groups = [
      {
        id: 'group-one',
        title: 'Checkpoint',
        placement: 'Course completion' as const,
        moduleId: '',
        lessonId: '',
        availableAfterDays: 0,
        dueAfterDays: null,
        required: true,
      },
    ];
    const pending = api.bank('course-one', [question], groups, course().updatedAt);
    expect(api.saving()).toBe(true);
    const body = request.mock.calls.at(-1)![1];
    question.options[0].text = 'Changed after submit';
    groups[0].title = 'Changed checkpoint';
    const submitted = [body.questions[0].options[0].text, body.groups[0].title];
    resolve(record());
    await pending;
    expect(submitted).toEqual(['Safeguarding lead', 'Checkpoint']);
    expect(api.saving()).toBe(false);
  });
});
