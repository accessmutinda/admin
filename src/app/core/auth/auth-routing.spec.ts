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
} from './auth.guard';

describe('API session routing', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/manage/rota/overview' } as RouterStateSnapshot;
  let auth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    state: ReturnType<typeof vi.fn>;
    profile: ReturnType<typeof vi.fn>;
    nextRoute: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    auth = {
      isAuthenticated: vi.fn(() => true),
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
    auth.profile.mockReturnValue({ company_entry_state: 'platform', can_select_workspace: true });
    expect(check(workspaceGuard)).toBe(true);
    expect(check(workspaceSelectionGuard)).toBe(true);
  });
});
