import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AcademyAssignmentsApi } from './academy-assignments-api.service';
import { AcademyApi } from './academy-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyCourse } from './academy.models';

describe('Academy staff assignment persistence', () => {
  const scope = signal('first'),
    companyId = signal('company-one'),
    allowed = signal(true);
  let api: AcademyAssignmentsApi, request: ReturnType<typeof vi.fn>;
  let authoring: {
    scope: typeof scope;
    courses: ReturnType<typeof vi.fn>;
    body: ReturnType<typeof vi.fn>;
    detail: ReturnType<typeof vi.fn>;
  };
  const row = () => ({
    id: 'assignment-one',
    company_id: companyId(),
    personId: 'worker',
    courseId: 'course',
    etag: '"v2"',
    version: 2,
    archived: false,
    completedAt: '',
  });
  const page = (results: unknown[], next: number | null = null) => ({
    results,
    next,
    meta: { company_id: companyId() },
  });
  beforeEach(() => {
    scope.set('first');
    companyId.set('company-one');
    allowed.set(true);
    request = vi.fn(async (path: string, body?: unknown) => {
      if (body) return { id: 'receipt', assignments: [row()] };
      if (path.includes('/staff?'))
        return page([
          { id: 'worker', name: 'Jane', status: 'Active', department: 'Care', role: 'Care Worker' },
        ]);
      if (path.includes('/courses?'))
        return page([{ id: 'course', title: 'Safeguarding', version: 7, status: 'Published' }]);
      return page([row()]);
    });
    authoring = {
      scope,
      courses: vi.fn(() => []),
      body: vi.fn(() => ({ title: 'Safeguarding' })),
      detail: vi.fn(async () => {}),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        { provide: CompanyAccessService, useValue: { can: () => allowed() } },
        { provide: ManagementStore, useValue: { companyId } },
        { provide: AcademyApi, useValue: authoring },
      ],
    });
    api = TestBed.inject(AcademyAssignmentsApi);
  });
  it('uses the saved due-soon window after the scoped collection loads', async () => {
    const implementation = request.getMockImplementation() as (path: string, body?: unknown) => Promise<Record<string, unknown>>;
    request.mockImplementation(async (path: string, body?: unknown) => ({...await implementation(path,body),meta:{company_id:companyId(),dueSoonDays:47}}));
    await api.load();
    expect(api.dueSoonDays()).toBe(47);
    allowed.set(false);
    expect(api.dueSoonDays()).toBeNull();
  });
  it('loads authoritative staff, courses and assignments without authoring access', async () => {
    await api.load();
    expect(api.staff()[0].name).toBe('Jane');
    expect(api.courses()[0].version).toBe(7);
    expect(api.assignments()[0].etag).toBe('"v2"');
    expect(request.mock.calls.every(([path]) => path.includes('/assignments'))).toBe(true);
  });
  it('loads every page before exposing the complete directory', async () => {
    const implementation = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) =>
      path.includes('/staff?page=1')
        ? page([{ id: 'first' }], 2)
        : path.includes('/staff?page=2')
          ? page([{ id: 'second' }])
          : implementation(path, body),
    );
    await api.load();
    expect(api.staff().map((p) => p.id)).toEqual(['first', 'second']);
  });
  it('sends the reviewed published revision and reloads after the write', async () => {
    await api.load();
    expect(
      await api.assign(
        ['worker'],
        ['course'],
        '2027-12-01',
        12,
        'Complete it',
        true,
        false,
        companyId(),
      ),
    ).toBeNull();
    const call = request.mock.calls.find(([, body]) => body)!;
    expect(call[0]).toBe('/companies/company-one/academy/assignments');
    expect(call[1]).toMatchObject({
      personIds: ['worker'],
      courses: [{ id: 'course', version: 7 }],
      channels: ['In-platform'],
    });
    expect(request.mock.calls.filter(([, body]) => !body).length).toBe(6);
  });
  it('sends current assignment ETags for refreshers and bulk commands', async () => {
    await api.load();
    await api.assign(['worker'], ['course'], '2027-12-01', 0, '', false, true, companyId());
    expect(
      request.mock.calls.find(([path, body]) => body && path.endsWith('/renew'))?.[1],
    ).toMatchObject({ assignments: [{ id: 'assignment-one', etag: '"v2"' }] });
    await api.bulk(['worker'], 'extend', '2028-01-01', companyId());
    expect(
      request.mock.calls.find(([path, body]) => body && path.endsWith('/extend'))?.[1],
    ).toMatchObject({ assignments: [{ id: 'assignment-one', etag: '"v2"' }], due: '2028-01-01' });
  });
  it('freezes submitted recipients and rejects overlapping writes', async () => {
    await api.load();
    let resolve!: (result: unknown) => void;
    request.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    const ids = ['worker'];
    const pending = api.assign(ids, ['course'], '2027-12-01', 0, '', false, false, companyId());
    ids.push('another');
    expect(api.saving()).toBe(true);
    expect(await api.bulk(['worker'], 'remind', '', companyId())).toMatch(/already saving/);
    expect(request.mock.calls.find(([, body]) => body)?.[1]).toMatchObject({
      personIds: ['worker'],
    });
    resolve({ id: 'receipt' });
    await pending;
    expect(api.saving()).toBe(false);
  });
  it('hides records immediately when the workspace or access changes', async () => {
    await api.load();
    scope.set('second');
    expect(api.staff()).toEqual([]);
    expect(api.assignments()).toEqual([]);
    TestBed.tick();
    scope.set('first');
    expect(api.staff()).toEqual([]);
    allowed.set(false);
    await expect(api.load()).rejects.toThrow(/access changed/);
  });
  it('clears all business data after backend access denial', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    expect(await api.bulk(['worker'], 'remind', '', companyId())).toBe('Access revoked');
    expect(api.staff()).toEqual([]);
    expect(api.assignments()).toEqual([]);
    expect(api.error()).toBe('Access revoked');
  });
  it('retains the idempotency key when a failed request is retried', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection lost'));
    await api.assign(['worker'], ['course'], '2027-12-01', 0, '', false, false, companyId());
    const first = request.mock.calls.find(([, body]) => body) as unknown as unknown[];
    await api.load();
    await api.assign(['worker'], ['course'], '2027-12-01', 0, '', false, false, companyId());
    const last = request.mock.calls.filter(([, body]) => body).at(-1) as unknown as unknown[];
    expect(last[3]).toEqual(first[3]);
  });
  it('rejects foreign-company responses', async () => {
    request.mockResolvedValueOnce({
      results: [],
      next: null,
      meta: { company_id: 'other-company' },
    });
    await expect(api.load()).rejects.toThrow(/workspace mismatch/);
    expect(api.staff()).toEqual([]);
  });
  it('publishes and assigns the reviewed source and criteria in one request', async () => {
    await api.load();
    authoring.courses.mockReturnValue([
      { course: { id: 'course', version: 7, etag: '"v7"', updatedAt: 'reviewed' } },
    ]);
    const course: AcademyCourse = {
      id: 'course',
      title: 'Safeguarding',
      description: 'Report concerns',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: 80,
      validityMonths: 12,
      status: 'Published',
      sample: false,
      thumbnailId: '',
      lessons: [],
      version: 7,
      updatedAt: 'reviewed',
      assignmentPlan: {
        method: 'By Role',
        roles: ['Care Worker'],
        team: 'All',
        personIds: [],
        priority: 'Normal',
        due: '2027-12-01',
        refresher: false,
        channels: ['In-platform'],
        recurrenceMonths: 12,
        message: 'Complete training',
      },
    };
    expect(await api.publishAndAssign(course, ['worker'], 'reviewed', companyId())).toBeNull();
    const call = request.mock.calls.find(
      ([path, body]) => body && path.endsWith('/publish-and-assign'),
    )!;
    expect(call[1]).toMatchObject({
      courseId: 'course',
      etag: '"v7"',
      assignment: {
        personIds: ['worker'],
        courses: [{ id: 'course', version: 7 }],
        roles: ['Care Worker'],
        team: 'All',
      },
    });
    expect(authoring.detail).toHaveBeenCalledWith('course');
  });
});
