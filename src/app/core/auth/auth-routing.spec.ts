import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import {
  authGuard,
  guestGuard,
  workspaceGuard,
  workspaceSelectionGuard,
  passwordChangeGuard,
  managementAccessGuard,
} from './auth.guard';

describe('API session routing', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/manage/rota/overview' } as RouterStateSnapshot;
  let auth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    state: ReturnType<typeof vi.fn>;
    profile: ReturnType<typeof vi.fn>;
    nextRoute: ReturnType<typeof vi.fn>;
    isSuperAdmin: ReturnType<typeof vi.fn>;
    canSwitchWorkspace: ReturnType<typeof vi.fn>;
    canAccessCompany: ReturnType<typeof vi.fn>;
    session: ReturnType<typeof vi.fn>;
    selectWorkspace: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    auth = {
      isAuthenticated: vi.fn(() => true),
      isSuperAdmin: vi.fn(() => false),
      canSwitchWorkspace: vi.fn(() => false),
      canAccessCompany: vi.fn((id) => id === 'company-1'),
      session: vi.fn(() => ({ workspaceId: 'company-1' })),
      selectWorkspace: vi.fn().mockResolvedValue(undefined),
      state: vi.fn(() => 'authenticated'),
      profile: vi.fn(() => ({
        company_entry_state: 'ready',
        company_id: 'company-1',
        can_select_workspace: false,
      })),
      nextRoute: vi.fn(() => '/manage/rota/overview'),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });
  function check(guard: typeof authGuard): boolean | string {
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    return result instanceof UrlTree
      ? TestBed.inject(Router).serializeUrl(result)
      : (result as boolean);
  }
  it('requires sign-in for protected routes and preserves the destination', () => {
    auth.isAuthenticated.mockReturnValue(false);
    auth.state.mockReturnValue('signed_out');
    expect(check(authGuard)).toBe('/auth/sign-in?redirectTo=%2Fmanage%2Frota%2Foverview');
  });
  it('routes a pending password change to its gate', () => {
    auth.isAuthenticated.mockReturnValue(false);
    auth.state.mockReturnValue('password_change_required');
    auth.nextRoute.mockReturnValue('/auth/change-password');
    expect(check(authGuard)).toBe('/auth/change-password');
    expect(check(passwordChangeGuard)).toBe(true);
  });
  it('enters an assigned company without opening the picker', () => {
    expect(check(workspaceGuard)).toBe(true);
    expect(check(workspaceSelectionGuard)).toBe('/manage/rota/overview');
    expect(check(guestGuard)).toBe('/manage/rota/overview');
  });
  it('denies entry for a suspended company', () => {
    auth.profile.mockReturnValue({ company_entry_state: 'suspended', can_select_workspace: false });
    expect(check(workspaceGuard)).toBe('/access-denied');
  });
  it('allows Super Admin to open the platform console and select a workspace', () => {
    auth.isSuperAdmin.mockReturnValue(true);
    auth.canSwitchWorkspace.mockReturnValue(true);
    auth.profile.mockReturnValue({ company_entry_state: 'platform', can_select_workspace: true });
    expect(check(workspaceGuard)).toBe(true);
    expect(check(workspaceSelectionGuard)).toBe(true);
  });
  function companyRoute(path: string, id?: string) {
    const snapshot = {
      routeConfig: { path: id ? 'companies/:id' : 'companies' },
      paramMap: { get: () => id },
    } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      managementAccessGuard(snapshot, { url: path } as RouterStateSnapshot),
    );
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }
  it('blocks Company Admin creation, directory and foreign-company direct links', () => {
    expect(companyRoute('/manage/companies/new')).toBe('/access-denied');
    expect(companyRoute('/manage/companies/directory')).toBe('/access-denied');
    expect(companyRoute('/manage/companies/company-2', 'company-2')).toBe('/access-denied');
    expect(companyRoute('/manage/companies/company-1', 'company-1')).toBe(true);
    expect(companyRoute('/manage/companies')).toBe('/manage/companies/company-1');
  });
  it('allows Super Admin creation and any company, and requires a workspace before business screens', async () => {
    auth.isSuperAdmin.mockReturnValue(true);
    expect(companyRoute('/manage/companies/new')).toBe(true);
    expect(await companyRoute('/manage/companies/company-2', 'company-2')).toBe(true);
    expect(auth.selectWorkspace).toHaveBeenCalledWith('company-2');
    auth.session.mockReturnValue({ workspaceId: null });
    expect(companyRoute('/manage/rota/overview')).toBe('/select-workspace');
  });
});
