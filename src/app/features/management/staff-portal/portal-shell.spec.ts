import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';

describe('Standalone staff portal', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });
  it('loads its own layout and dedicated navigation outside the management layout', async () => {
    const harness = await RouterTestingHarness.create('/staff-portal/dashboard');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('cv-staff-portal')).not.toBeNull();
    expect(root.querySelector('cv-management-layout')).toBeNull();
    const links = Array.from(root.querySelectorAll('nav[aria-label="Staff portal navigation"] a'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/staff-portal/dashboard',
      '/staff-portal/training/dashboard',
      '/staff-portal/training/courses',
      '/staff-portal/training/assessments',
      '/staff-portal/training/certificates',
      '/staff-portal/journal',
      '/staff-portal/tasks',
      '/staff-portal/concerns',
      '/staff-portal/service-users',
      '/staff-portal/oversight',
    ]);
    expect(root.querySelector('.staff-console')?.textContent).toContain('Staff Portal');
    expect(root.querySelector('.portal-nav')).toBeNull();
  });
  it('redirects the removed dashboard to the main dashboard and removes its navigation', async () => {
    const harness = await RouterTestingHarness.create(
      '/staff-portal/dashboard-2?source=bookmark#tasks',
    );
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/staff-portal/dashboard?source=bookmark#tasks');
    expect(root.querySelector('h1')?.textContent).toContain(
      'Staff Dashboard – Communication & Tasks',
    );
    expect(root.querySelector('cv-portal-dashboard.dashboard-two')).toBeNull();
    expect(root.querySelector('a[href="/staff-portal/dashboard-2"]')).toBeNull();
    expect(root.querySelector('nav[aria-label="Dashboard designs"]')).toBeNull();
    expect(root.querySelectorAll('.portal-stat-row .metric')).toHaveLength(4);
    await harness.navigateByUrl('/staff-portal/oversight');
    expect(root.querySelector('h1')?.textContent).toContain('Manager Dashboard');
    expect(root.querySelector('nav[aria-label="Dashboard designs"]')).toBeNull();
  });
  it('redirects previous portal URLs while preserving the destination and query', async () => {
    const harness = await RouterTestingHarness.create('/manage/staff-portal/tasks?new=true');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('cv-management-layout')).toBeNull();
    expect(root.querySelector('cv-portal-tasks')).not.toBeNull();
    expect(root.querySelector('input[name="taskTitle"]')).not.toBeNull();
  });
  it('redirects the original journal URL to the standalone portal', async () => {
    const harness = await RouterTestingHarness.create('/manage/staff-journal');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('cv-management-layout')).toBeNull();
    expect(root.querySelector('cv-staff-journal')).not.toBeNull();
  });
});
