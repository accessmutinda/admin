import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AcademyDashboard } from './academy-dashboard';
import { AcademyDashboardApi } from './academy-dashboard-api.service';
import { AcademyAdminNav } from './academy-shared';
import { dashboardData } from './academy-dashboard-test-data';
import type { AcademyDashboardRead } from './academy.generated';
@Component({ selector: 'cv-academy-admin-nav', template: '' })
class NavigationStub {}
describe('Academy dashboard screen', () => {
  const data = signal<AcademyDashboardRead | null>(null);
  let api: {
    data: typeof data;
    scope: ReturnType<typeof signal<string>>;
    available: () => boolean;
    can: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    error: () => string;
    loading: () => boolean;
  };
  beforeEach(() => {
    data.set(dashboardData());
    api = {
      data,
      scope: signal('scope'),
      available: () => true,
      can: vi.fn((_feature: string, action = 'read') => action === 'read'),
      load: vi.fn(async () => {}),
      error: () => '',
      loading: () => false,
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AcademyDashboardApi, useValue: api }],
    });
    TestBed.overrideComponent(AcademyDashboard, {
      remove: { imports: [AcademyAdminNav] },
      add: { imports: [NavigationStub] },
    });
  });
  it('uses source learner names, current counts and real integration status without a workforce store', async () => {
    const fixture = TestBed.createComponent(AcademyDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Canonical learner');
    expect(root.textContent).toContain('50%');
    expect(root.textContent).toContain('Not configured');
    expect(root.textContent).not.toContain('fully automated');
    expect(
      Array.from(root.querySelectorAll('a')).some((a) => a.textContent?.includes('Assign Course')),
    ).toBe(false);
    expect(root.querySelector('a[href="/manage/learning/courses"]')).toBeNull();
  });
  it('hides every aggregate on source failure instead of displaying zero or old records', async () => {
    const fixture = TestBed.createComponent(AcademyDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    data.set(null);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Academy dashboard is unavailable');
    expect(root.textContent).not.toContain('Canonical learner');
    expect(root.querySelector('.dashboard-stats')).toBeNull();
  });
});
