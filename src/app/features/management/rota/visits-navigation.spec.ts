import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementLayout } from '../layout/management-layout';
import { RotaService } from './rota.service';

@Component({ template: '' })
class Destination {}

const children = routes.find((route) => route.path === 'manage')!.children!;

describe('Visits & Rota navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
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
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('opens the weekly allocation workspace with its supporting panels', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
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

  it('updates call-package statistics from saved packages', async () => {
    const harness = await RouterTestingHarness.create('/manage/rota/call-packages');
    const service = TestBed.inject(RotaService);
    const count = service.data().calls.filter((call) => call.active).length;
    service.saveClient({
      id: 'stat-client',
      name: 'Statistics client',
      reference: 'ST1',
      address: '1 Road',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
    });
    service.saveCall({
      id: 'stat-call',
      clientId: 'stat-client',
      name: 'Lunch call',
      start: '12:00',
      end: '12:30',
      weekdays: [1],
      carers: 1,
      skills: [],
      regularStaffIds: [],
      tasks: 'Prepare lunch',
      active: true,
    });
    harness.detectChanges();
    const metric = Array.from(harness.routeNativeElement!.querySelectorAll('.metric')).find(
      (item) => item.querySelector('h2')?.textContent === 'Active call packages',
    )!;
    expect(metric.querySelector('strong')?.textContent).toBe(String(count + 1));
  });
});
