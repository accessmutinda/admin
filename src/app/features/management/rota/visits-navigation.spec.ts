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

  it('opens the view cards without automatically opening the weekly schedule', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
    expect(harness.routeNativeElement!.querySelectorAll('.co-check-card')).toHaveLength(5);
    expect(harness.routeNativeElement!.querySelector('.co-check-card')?.textContent).toContain(
      'Schedule',
    );
    expect(harness.routeNativeElement!.querySelector('.planner-filter-panel')).toBeNull();
    expect(
      harness.routeNativeElement!.querySelector('.visits-overview-grid > cv-visits-navigation'),
    ).not.toBeNull();
    expect(
      harness.routeNativeElement!.querySelector('.visits-overview-grid > aside [cvQuickActions]'),
    ).not.toBeNull();
    expect(harness.routeNativeElement!.textContent).not.toContain('Open view');
    expect(
      harness.routeNativeElement!.querySelector('a.co-check-card[href="/manage/ecm"]')?.textContent,
    ).toContain('Live Visits / ECM');
  });

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

  it('keeps the stat cards mounted while hiding landing cards from selected views', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/rota/overview');
    const summary = harness.routeNativeElement!.querySelector('.care-stats');
    const summaryText = summary!.textContent;
    for (const view of ['planner', 'call-packages', 'publishing', 'history']) {
      await harness.navigateByUrl('/manage/rota/' + view);
      expect(harness.routeNativeElement!.querySelector('.care-stats')).toBe(summary);
      expect(harness.routeNativeElement!.querySelector('cv-visits-navigation')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('.visits-overview-actions')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('.planner-summary')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('cv-visits-attention')).toBeNull();
      expect(summary!.textContent).toBe(summaryText);
      expect(harness.routeNativeElement!.querySelectorAll('h1')).toHaveLength(1);
    }
    await harness.navigateByUrl('/manage/rota/overview');
    expect(harness.routeNativeElement!.querySelector('.care-stats')).toBe(summary);
    expect(harness.routeNativeElement!.querySelectorAll('.co-check-card')).toHaveLength(5);
  });
});
