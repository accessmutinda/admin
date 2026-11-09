import { TestBed } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subject } from 'rxjs';
import { PageNavigation } from './page-navigation.service';
import { PageLoading } from '../../shared/layouts/page-loading';

describe('Page navigation feedback', () => {
  const events = new Subject<unknown>();
  const router = { url: '/manage/people', events, currentNavigation: () => null };
  beforeEach(() => {
    router.url = '/manage/people';
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
  });
  it('shows the destination while guards are pending and clears when navigation completes', () => {
    const navigation = TestBed.inject(PageNavigation);
    events.next(new NavigationStart(1, '/manage/companies'));
    expect(navigation.destination()).toBe('/manage/companies');
    events.next(new NavigationEnd(1, '/manage/companies', '/manage/companies'));
    expect(navigation.destination()).toBe('');
  });
  it('restores the previous screen on a rejected departure or error', () => {
    const navigation = TestBed.inject(PageNavigation);
    events.next(new NavigationStart(1, '/manage/companies'));
    events.next(
      new NavigationCancel(
        1,
        '/manage/companies',
        'Unsaved edits',
        NavigationCancellationCode.GuardRejected,
      ),
    );
    expect(navigation.destination()).toBe('');
    events.next(new NavigationStart(2, '/manage/companies'));
    events.next(new NavigationError(2, '/manage/companies', new Error('Chunk unavailable')));
    expect(navigation.destination()).toBe('');
  });
  it('keeps the latest destination when an older navigation is cancelled', () => {
    const navigation = TestBed.inject(PageNavigation);
    events.next(new NavigationStart(1, '/manage/companies'));
    events.next(new NavigationStart(2, '/manage/locations'));
    events.next(
      new NavigationCancel(
        1,
        '/manage/companies',
        'Superseded',
        NavigationCancellationCode.SupersededByNewNavigation,
      ),
    );
    expect(navigation.destination()).toBe('/manage/locations');
  });
  it('does not hide an editor for filter changes on the same screen', () => {
    const navigation = TestBed.inject(PageNavigation);
    events.next(new NavigationStart(1, '/manage/people?q=care'));
    expect(navigation.destination()).toBe('');
  });
  it('shows immediate feedback for staff, inspector, family, account and authentication pages', () => {
    const navigation = TestBed.inject(PageNavigation);
    for (const [index, url] of [
      '/staff-portal/tasks',
      '/inspector/reports',
      '/family-portal/messages',
      '/account/security',
      '/auth/forgot-password',
    ].entries()) {
      events.next(new NavigationStart(index + 1, url));
      expect(navigation.destination()).toBe(url);
    }
  });
  it('preserves portal shells for internal navigation and uses a full loading view when switching shells', () => {
    const navigation = TestBed.inject(PageNavigation);
    router.url = '/staff-portal/dashboard';
    events.next(new NavigationStart(1, '/staff-portal/tasks'));
    expect(navigation.localDestination('staff')).toBe('/staff-portal/tasks');
    expect(navigation.rootDestination()).toBe('');
    events.next(new NavigationStart(2, '/inspector/reports'));
    expect(navigation.localDestination('staff')).toBe('');
    expect(navigation.rootDestination()).toBe('/inspector/reports');
    router.url = '/inspector/reports';
    expect(navigation.rootDestination()).toBe('/inspector/reports');
  });
  it('uses the existing company and submodule skeletons without mounting destination content', () => {
    const fixture = TestBed.createComponent(PageLoading);
    fixture.componentRef.setInput('url', '/manage/companies');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('cv-skeleton').length).toBeGreaterThan(10);
    expect(fixture.nativeElement.querySelector('input, button, a')).toBeNull();
    fixture.componentRef.setInput('url', '/manage/companies/north/modules/configure');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-modules-loading')).toBeTruthy();
  });
});
