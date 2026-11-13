import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { PortalShell } from './portal-shell';
import { PORTAL_ROUTES } from './portal.routes';

const company = { id: 'north', name: 'North Care', code: 'NORTH' };
describe('Standalone staff portal', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ roleCode: 'CW', name: 'Worker', initials: 'W' }),
            signOut: vi.fn(),
            canSwitchWorkspace: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            context: () => null,
            refreshForNavigation: vi.fn().mockResolvedValue(undefined),
            canPath: () => false,
          },
        },
        { provide: StaffDashboardApi, useValue: { company: signal(company), error: signal('') } },
      ],
    });
    TestBed.overrideComponent(PortalShell, { set: { template: '' } });
  });
  it('uses verified company metadata on tasks, journal and dashboard routes', () => {
    const router = TestBed.inject(Router);
    for (const path of [
      '/staff-portal/tasks?new=true',
      '/staff-portal/journal',
      '/staff-portal/dashboard',
      '/staff-portal/oversight?activity=all',
      '/staff-portal/concerns/one',
      '/staff-portal/service-users/one/overview',
      '/staff-portal/training/refreshers',
      '/staff-portal/training/messages',
      '/staff-portal/training/courses/course/lessons/lesson',
    ]) {
      const url = vi.spyOn(router, 'url', 'get').mockReturnValue(path);
      const fixture = TestBed.createComponent(PortalShell);
      const shell = fixture.componentInstance as any;
      expect(shell.dashboardView()).toBe(true);
      expect(shell.store.company()).toEqual(company);
      fixture.destroy();
      url.mockRestore();
    }
  });
  it.each(['/staff-portal/tasks?task=record','/staff-portal/training/refreshers','/staff-portal/training/messages','/staff-portal/service-users/one/audit'])('allows %s to reach branded staff verification when navigation access is denied', async (path) => {
    const guard = routes.find((route) => route.path === 'staff-portal')!
      .canActivateChild![0] as CanActivateChildFn;
    const result = await TestBed.runInInjectionContext(() =>
      guard(
        {} as ActivatedRouteSnapshot,
        { url: path } as RouterStateSnapshot,
      ),
    );
    expect(result).toBe(true);
    expect(TestBed.inject(CompanyAccessService).refreshForNavigation).toHaveBeenCalled();
  });
  it('retains route access enforcement for other staff portal destinations', async () => {
    const guard = routes.find((route) => route.path === 'staff-portal')!
      .canActivateChild![0] as CanActivateChildFn;
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: '/staff-portal/unconnected' } as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/access-denied');
  });
  it('redirects the retired dashboard while preserving its query and fragment', () => {
    const redirect = PORTAL_ROUTES.find((route) => route.path === 'dashboard-2')!.redirectTo as any;
    const result = TestBed.runInInjectionContext(() =>
      redirect({ queryParams: { source: 'bookmark' }, fragment: 'tasks' }),
    );
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/staff-portal/dashboard?source=bookmark#tasks',
    );
    expect(PORTAL_ROUTES.some((route) => route.path === 'tasks' && !!route.providers?.length)).toBe(
      true,
    );
  });
  it('keeps workspace switching limited to accounts with explicit selector authority', () => {
    const router=TestBed.inject(Router);
    const navigate=vi.spyOn(router,'navigateByUrl').mockResolvedValue(true);
    const shell=TestBed.createComponent(PortalShell).componentInstance as any;
    shell.switchWorkspace();expect(navigate).not.toHaveBeenCalled();
    vi.mocked(TestBed.inject(AuthService).canSwitchWorkspace).mockReturnValue(true);
    shell.switchWorkspace();expect(navigate).toHaveBeenCalledWith('/select-workspace');
  });
  it('does not send the shared search into an unavailable staff directory', () => {
    const router=TestBed.inject(Router),navigate=vi.spyOn(router,'navigate').mockResolvedValue(true);
    const shell=TestBed.createComponent(PortalShell).componentInstance as any;
    shell.search(new Event('submit'),'Assigned person');expect(navigate).not.toHaveBeenCalled();
    vi.spyOn(TestBed.inject(CompanyAccessService),'canPath').mockReturnValue(true);
    shell.search(new Event('submit'),' Assigned person ');
    expect(navigate).toHaveBeenCalledWith(['/staff-portal/service-users'],{queryParams:{q:'Assigned person'}});
  });

});
