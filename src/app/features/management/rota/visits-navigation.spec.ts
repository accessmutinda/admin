import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementLayout } from '../layout/management-layout';
import { By } from '@angular/platform-browser';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { CompaniesApiService } from '../companies/companies-api.service';
import { RosterApi } from './roster-api.service';
import { Rota } from './rota';
import { rosterWorkspace } from './roster.spec-fixtures';

@Component({ template: '' })
class Destination {}

const children = routes.find((route) => route.path === 'manage')!.children!;

describe('Visits & Rota navigation', () => {
  let workspace: any;
  async function settle(harness: RouterTestingHarness) {
    for (let i = 0; i < 4; i++) {
      harness.detectChanges();
      await harness.fixture.whenStable();
    }
    harness.detectChanges();
  }
  beforeEach(() => {
    localStorage.clear();
    workspace = rosterWorkspace();
    const selected = signal(null);
    const api = vi.fn(async (path: string) => {
      const base = structuredClone(workspace);
      if (path.includes('/call-packages/workspace?'))
        return {
          company_id: 'north',
          count: base.calls.length,
          next: null,
          previous: null,
          results: base.calls,
          context: base,
          meta: {
            revision: 'v1',
            metrics: {
              active_clients: 1,
              active_packages: base.calls.length,
              regular_carers: 0,
              priority_packages: 0,
            },
            training_options: [],
          },
        };
      if (path.includes('/history'))
        return {
          company_id: 'north',
          count: 0,
          next: null,
          previous: null,
          results: [],
          context: base,
          meta: {
            revision: 'v1',
            as_of: '2026-11-15T10:00:00Z',
            metrics: { visits: 0, completed: 0, cancelled: 0, audit: 0 },
            training_options: [],
          },
        };
      if (path.includes('/publishing?'))
        return {
          ...base,
          metrics: { drafts: 0, unallocated: 0, conflicts: 0, published: 0 },
          reviews: {},
          training_options: [],
        };
      if (path.includes('/overview?'))
        return {
          ...base,
          matching_visit_ids: [],
          visit_statuses: {},
          metrics: ['total', 'allocated', 'unallocated', 'double_up', 'staff', 'late'].map(
            (key) => ({ key, value: 0, percentage: 0, previous: 0 }),
          ),
          alerts: [],
          training_options: [],
        };
      if (path.includes('package-handoffs'))
        return { company_id: 'north', count: 0, results: [], next: null };
      return base;
    });
    const access = { can: () => true, canPath: () => true, context: signal(null) };
    const auth = {
      api,
      isAuthenticated: () => true,
      isSuperAdmin: () => false,
      hasRole: () => true,
      canSwitchWorkspace: () => false,
      canAccessCompany: () => true,
      profile: signal({ id: 'actor', company_id: 'north', company_entry_state: 'ready' }),
      currentUser: () => ({ id: 'actor', roleCode: 'CA', name: 'Rota Reviewer', initials: 'RR' }),
      workspaces: signal([]),
      session: signal({ workspaceId: 'north' }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: CompanyAccessService, useValue: access },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope: signal('north:actor'),
            companyId: signal('north'),
            allowed: () => true,
            access,
            selected,
            error: signal(''),
            detail: vi.fn(async () => {}),
            detailPending: () => false,
          },
        },
        {
          provide: CompaniesApiService,
          useValue: { scope: () => null, companies: () => [], details: () => ({}) },
        },
        provideRouter([
          {
            path: 'manage',
            children: children
              .filter((route) => route.path === 'rota' || route.path === 'ecm')
              .map((route) =>
                route.path === 'ecm' ? { path: route.path, component: Destination } : route,
              ),
          },
        ]),
      ],
    });
  });

  it('opens the weekly allocation workspace with its supporting panels', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
    await settle(harness);
    const element = harness.routeNativeElement!;
    expect(element.querySelector('.planner-grid')).not.toBeNull();
    expect(element.querySelector('.planner-filter-panel')).not.toBeNull();
    expect(element.querySelector('.planner-cover-panel')).not.toBeNull();
    expect(element.querySelector('.planner-issues-panel')).not.toBeNull();
    expect(element.querySelector('.planner-quick-panel')).not.toBeNull();
    expect(element.querySelectorAll('.roster-stat')).toHaveLength(6);
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelectorAll('a[href]')).toHaveLength(0);
  }, 20000);

  it('preserves client context when an existing call-package link is opened', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota?client=client-1');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/call-packages?client=client-1');
  });

  it('retains staff and dates when opening an existing staff schedule link', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota?staff=staff-1&from=2026-10-18');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/planner?staff=staff-1&from=2026-10-18');
  });

  it('redirects the former live tab to the dedicated ECM destination with its parameters', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota/live?date=2026-10-18');
    expect(TestBed.inject(Router).url).toBe('/manage/ecm?date=2026-10-18');
  });

  it('opens standalone pages with one heading and page-specific statistics', async () => {
    const harness = await RouterTestingHarness.create();
    for (const view of ['overview', 'planner', 'call-packages', 'publishing', 'history']) {
      await harness.navigateByUrl('/manage/rota/' + view);
      await settle(harness);
      const element = harness.routeNativeElement!;
      expect(element.querySelectorAll('h1')).toHaveLength(1);
      expect(element.querySelector('.visits-section-links')).toBeNull();
      expect(element.querySelector('.rota-navigation')).toBeNull();
      expect(element.querySelectorAll('.roster-stat, .metrics .metric')).toHaveLength(
        ['overview', 'planner'].includes(view) ? 6 : 4,
      );
      expect(!!element.querySelector('.planner-grid')).toBe(['overview', 'planner'].includes(view));
    }
  });

  it('expands the sidebar menu in the requested order and closes it with Escape', () => {
    TestBed.inject(Router).navigateByUrl('/');
    const fixture = TestBed.createComponent(ManagementLayout);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.visits-submenu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    const menu = element.querySelector('.visits-submenu')!;
    const links = Array.from(menu.querySelectorAll('a'));
    expect(links.map((link) => link.querySelector('span:last-child')?.textContent?.trim())).toEqual(
      ['Overview', 'Call packages', 'Publishing', 'History & audit'],
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/manage/rota/overview',
      '/manage/rota/call-packages',
      '/manage/rota/publishing',
      '/manage/rota/history',
    ]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('.visits-submenu')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('updates call-package statistics from the refreshed server register', async () => {
    const harness = await RouterTestingHarness.create('/manage/rota/call-packages');
    await settle(harness);
    const service = harness.routeDebugElement!.query(By.directive(Rota)).injector.get(RosterApi);
    const count = workspace.calls.length;
    workspace.calls.push({ ...workspace.calls[0], id: 'second-call', name: 'Lunch care' });
    await service.refresh();
    await settle(harness);
    const metric = Array.from(harness.routeNativeElement!.querySelectorAll('.metric')).find(
      (item) => item.querySelector('h2')?.textContent === 'Active call packages',
    )!;
    expect(metric.querySelector('strong')?.textContent).toBe(String(count + 1));
  });
});
