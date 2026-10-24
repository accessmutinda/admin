import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';

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

  it('preserves supporting workflows and a single heading when navigating between views', async () => {
    const harness = await RouterTestingHarness.create();
    for (const view of ['overview', 'planner', 'call-packages', 'publishing', 'history']) {
      await harness.navigateByUrl('/manage/rota/' + view);
      const element = harness.routeNativeElement!;
      expect(element.querySelectorAll('h1')).toHaveLength(1);
      expect(element.querySelectorAll('.visits-section-links a')).toHaveLength(
        ['overview', 'planner'].includes(view) ? 0 : 5,
      );
      expect(!!element.querySelector('.planner-grid')).toBe(['overview', 'planner'].includes(view));
    }
  });
});
