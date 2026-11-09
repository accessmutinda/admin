import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  NavigationError,
  NavigationStart,
  NavigationCancel,
  NavigationCancellationCode,
  Event,
  Router,
  provideRouter,
} from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './core/auth/auth.service';
import { App } from './app';
describe('Application session skeleton', () => {
  it('renders the branded shell before session restoration and defers routing until authority is known', async () => {
    let restore!: () => void;
    const initialize = vi.fn(() => new Promise<void>((resolve) => (restore = resolve)));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { initialize } }],
    });
    const router = TestBed.inject(Router);
    const events = new Subject<NavigationEnd | NavigationError>();
    vi.spyOn(router, 'events', 'get').mockReturnValue(events);
    const navigate = vi.spyOn(router, 'initialNavigation').mockImplementation(() => {});
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-busy=true]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    restore();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledOnce();
    events.next(new NavigationEnd(1, '/auth/sign-in', '/auth/sign-in'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-auth-loading')).toBeNull();
  });
  it('shows the global destination skeleton while a page transition is pending and restores on cancellation', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { initialize: () => new Promise<void>(() => {}) } },
      ],
    });
    const router = TestBed.inject(Router);
    const events = new Subject<Event>();
    vi.spyOn(router, 'events', 'get').mockReturnValue(events);
    const fixture = TestBed.createComponent(App);
    events.next(new NavigationEnd(1, '/auth/sign-in', '/auth/sign-in'));
    fixture.detectChanges();
    events.next(new NavigationStart(2, '/staff-portal/tasks'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-page-transition cv-page-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.app-route-content').hidden).toBe(true);
    events.next(
      new NavigationCancel(
        2,
        '/staff-portal/tasks',
        'Rejected',
        NavigationCancellationCode.GuardRejected,
      ),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-page-transition')).toBeNull();
    expect(fixture.nativeElement.querySelector('.app-route-content').hidden).toBe(false);
    events.next(new NavigationStart(3, '/auth/forgot-password'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-page-transition cv-auth-loading')).toBeTruthy();
  });
});
