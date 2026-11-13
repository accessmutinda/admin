import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Navigation, Router, provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AccessContext, CompanyAccessService, routeAccess } from './company-access.service';

describe('Company product access', () => {
  let access: CompanyAccessService;
  const api = vi.fn();
  const profile = signal({ id: 'user', company_id: 'north' });
  const context: AccessContext = {
    company_id: 'north',
    company_active: true,
    platform: false,
    revision: 1,
    enabled_modules: ['care'],
    roles: [],
    permissions: ['care.records.read'],
    core_permissions: [],
    can_manage_modules: false,
    can_manage_roles: false,
    can_create_roles: false,
  };
  beforeEach(() => {
    api.mockReset().mockResolvedValue(context);
    profile.set({ id: 'user', company_id: 'north' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, isSuperAdmin: () => false, profile, api },
        },
      ],
    });
    access = TestBed.inject(CompanyAccessService);
  });
  it('denies missing grants, actions and other-company contexts', () => {
    expect(access.can('care', 'records')).toBe(false);
    access.context.set(context);
    expect(access.canPath('/manage/clients')).toBe(true);
    expect(access.canPath('/manage/clients/one/medication')).toBe(false);
    expect(access.can('care', 'records', 'edit')).toBe(false);
    expect(access.canPath('/manage/companies/north/modules/overview')).toBe(false);
    access.context.set({ ...context, company_id: 'south' });
    expect(access.can('care', 'records')).toBe(false);
  });
  it('denies inactive companies even when a role grant exists', () => {
    access.context.set({ ...context, company_active: false });
    expect(access.can('care', 'records')).toBe(false);
  });
  it('refreshes authority from server and clears it on failure', async () => {
    await access.refresh();
    expect(access.can('care', 'records')).toBe(true);
    api.mockRejectedValue(new Error('Unavailable'));
    await access.refresh();
    expect(access.context()).toBeNull();
    expect(access.can('care', 'records')).toBe(false);
  });
  it.each(['/staff-portal/oversight','/staff-portal/dashboard','/staff-portal/journal','/staff-portal/tasks','/staff-portal/concerns/one','/staff-portal/service-users/one/overview','/staff-portal/training/refreshers','/staff-portal/training/messages','/staff-portal/training/courses/course/lessons/lesson'])('lets %s verify its staff identity without granting navigation authority', async (path) => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue(path);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await access.refresh();
    expect(access.canPath(path)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    api.mockRejectedValue(Error('Unavailable'));
    await access.refresh();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('gives Super Admin every module and submodule independently of company activation', () => {
    vi.spyOn(TestBed.inject(AuthService), 'isSuperAdmin').mockReturnValue(true);
    access.context.set(null);
    for (const module of [
      'care',
      'people',
      'academy',
      'quality',
      'finance',
      'reports',
      'staff_portal',
      'family_portal',
      'inspector_portal',
    ]) {
      expect(access.can(module)).toBe(true);
      expect(access.can(module, 'any-submodule', 'edit')).toBe(true);
    }
    access.context.set({ ...context, company_active: false, enabled_modules: [], permissions: [] });
    expect(access.canPath('/manage/clients/one/medication')).toBe(true);
  });
  it('shares the access result across guards in one navigation and refreshes on the next', async () => {
    TestBed.tick();
    await access.refresh();
    api.mockClear();
    const current = vi.spyOn(TestBed.inject(Router), 'currentNavigation');
    current.mockReturnValue({ id: 10 } as Navigation);
    const first = access.refreshForNavigation();
    expect(access.refreshForNavigation()).toBe(first);
    await first;
    await access.refreshForNavigation();
    expect(api).toHaveBeenCalledTimes(1);
    current.mockReturnValue({ id: 11 } as Navigation);
    await access.refreshForNavigation();
    expect(api).toHaveBeenCalledTimes(2);
  });
  it('does not reuse a navigation check after the actor changes in the same company', async () => {
    TestBed.tick();
    await access.refresh();
    vi.spyOn(TestBed.inject(Router), 'currentNavigation').mockReturnValue({ id: 10 } as Navigation);
    const previous = access.refreshForNavigation();
    await previous;
    profile.set({ id: 'another-user', company_id: 'north' });
    TestBed.tick();
    const next = access.refreshForNavigation();
    expect(next).not.toBe(previous);
    await next;
  });
  it('waits for current authority when the initial scope effect supersedes a navigation request', async () => {
    let resolveFirst!: (value: AccessContext) => void;
    let resolveCurrent!: (value: AccessContext) => void;
    api
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCurrent = resolve;
          }),
      );
    vi.spyOn(TestBed.inject(Router), 'currentNavigation').mockReturnValue({ id: 1 } as Navigation);
    const pending = access.refreshForNavigation();
    TestBed.tick();
    resolveFirst(context);
    await Promise.resolve();
    expect(access.context()).toBeNull();
    resolveCurrent({ ...context, permissions: ['care.medication.read'] });
    await pending;
    expect(access.canPath('/manage/clients/one/medication')).toBe(true);
    expect(api).toHaveBeenCalledTimes(2);
  });
  it('maps feature routes independently of role labels', () => {
    expect(routeAccess('/manage/learning')).toEqual(
      ['reports', 'courses', 'assignments', 'results', 'certificates', 'governance'].map(
        (feature) => ['academy', feature],
      ),
    );
    expect(routeAccess('/manage/learning/certificates')).toEqual([['academy', 'certificates']]);
    expect(routeAccess('/manage/people/staff/one/documents')).toEqual([['people', 'records']]);
    expect(routeAccess('/staff-portal/training')).toEqual([
      ['staff_portal', '*'],
      ['academy', 'learner'],
    ]);
  });
  it('requires staff records and an owning workflow grant for compliance evidence pages', () => {
    access.context.set({ ...context, permissions: ['people.records.read'] });
    expect(access.canPath('/manage/people/staff/one/documents')).toBe(false);
    expect(access.canPath('/manage/people/compliance')).toBe(false);
    access.context.set({
      ...context,
      permissions: ['people.records.read', 'people.compliance.read'],
    });
    expect(access.canPath('/manage/people/compliance')).toBe(true);
    expect(access.canPath('/manage/people/staff/one/compliance')).toBe(true);
    expect(access.canPath('/manage/people/staff/one/documents')).toBe(true);
    expect(access.canPath('/manage/people/staff/one/personal')).toBe(false);
    expect(access.canPath('/manage/people/staff/one/documents', 'edit')).toBe(false);
    access.context.set({
      ...context,
      permissions: ['people.records.read', 'people.onboarding.read'],
    });
    expect(access.canPath('/manage/people/staff/one/compliance')).toBe(true);
    expect(access.canPath('/manage/people/compliance')).toBe(false);
  });
});
